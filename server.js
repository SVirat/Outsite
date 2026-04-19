import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── ENV ────────────────────────────────────────────────────────────────────────
function loadEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}
const env = loadEnv();
Object.assign(process.env, env);

const PORT = 3000;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GDRIVE_ROOT = process.env.GDRIVE_ROOT_FOLDER_NAME || 'PropertyVault';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const VALID_ROLES = ['family_contributor', 'family_view', 'non_family_view'];

// ── SUPABASE HELPER ────────────────────────────────────────────────────────────
function supabaseForUser(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// Admin client — bypasses RLS for cross-account queries
let _adminSb;
function adminSupabase() {
  if (!_adminSb) {
    _adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return _adminSb;
}

// ── GOOGLE DRIVE HELPERS ───────────────────────────────────────────────────────
async function refreshGoogleToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to refresh Google token');
  return data.access_token;
}

async function driveFind(token, name, parentId) {
  let q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.files?.[0] || null;
}

async function driveCreateFolder(token, name, parentId) {
  const body = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function driveGetOrCreateFolder(token, name, parentId) {
  return (await driveFind(token, name, parentId)) || (await driveCreateFolder(token, name, parentId));
}

async function driveRenameFolder(token, folderId, newName) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });
  return res.json();
}

async function driveUpload(token, fileName, mimeType, buffer, parentId) {
  const boundary = 'b' + Date.now();
  const meta = JSON.stringify({ name: fileName, parents: [parentId] });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  return res.json();
}

async function getGoogleAccessToken(supabase, userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('google_access_token, google_refresh_token')
    .eq('id', userId)
    .single();
  if (!data?.google_refresh_token) throw new Error('No Google refresh token');
  const newToken = await refreshGoogleToken(data.google_refresh_token);
  await supabase.from('user_profiles').update({ google_access_token: newToken }).eq('id', userId);
  return newToken;
}

// ── AUTH MIDDLEWARE ─────────────────────────────────────────────────────────────
// Short-lived in-memory profile cache (avoids DB hit on rapid sequential requests)
const _profileCache = new Map();
const PROFILE_TTL = 30_000; // 30 seconds

async function auth(req, res, next) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = hdr.slice(7);
  try {
    const sb = supabaseForUser(token);
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Profile: serve from short-lived cache when available
    const cached = _profileCache.get(user.id);
    let profile;
    if (cached && Date.now() - cached.ts < PROFILE_TTL) {
      profile = cached.data;
    } else {
      const { data } = await sb.from('user_profiles').select('*').eq('id', user.id).single();
      profile = data;
      _profileCache.set(user.id, { data: profile, ts: Date.now() });
    }

    req.user = user;
    req.profile = profile || { id: user.id, role: 'admin' };
    req.supabase = sb;

    // Resolve active account — X-Account-Id header, default to own account
    const requestedAccount = req.headers['x-account-id'];
    if (requestedAccount && requestedAccount !== user.id) {
      const admin = adminSupabase();
      const { data: membership } = await admin
        .from('account_members')
        .select('role')
        .eq('owner_id', requestedAccount)
        .eq('user_id', user.id)
        .single();
      if (!membership) return res.status(403).json({ error: 'No access to this account' });
      req.accountId = requestedAccount;
      req.effectiveRole = membership.role;
    } else {
      req.accountId = user.id;
      req.effectiveRole = 'admin';
    }

    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.effectiveRole)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// ── EXPRESS APP ────────────────────────────────────────────────────────────────
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use('/api', express.json());

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolve a property param (UUID or slug) to the property row
async function resolveProperty(param, accountId) {
  const admin = adminSupabase();
  if (UUID_RE.test(param)) {
    const { data } = await admin.from('properties').select('*, documents(*)').eq('id', param).eq('owner_id', accountId).single();
    return data || null;
  }
  const { data: all } = await admin.from('properties').select('*, documents(*)').eq('owner_id', accountId);
  if (!all) return null;
  return all.find(p => slugify(p.name) === param) || null;
}

// ── API: CONFIG ────────────────────────────────────────────────────────────────
app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });
});

// ── API: AUTH ──────────────────────────────────────────────────────────────────
app.get('/api/user', auth, async (req, res) => {
  const u = req.user;
  const p = req.profile;

  // Link pending invitations by email (one-time on login, not every request)
  const admin = adminSupabase();
  await admin
    .from('account_members')
    .update({ user_id: u.id })
    .eq('email', u.email)
    .is('user_id', null);

  // Get accounts this user is a member of
  let accounts = [{ id: u.id, name: 'My Properties', role: 'admin' }];
  const { data: memberships } = await admin
    .from('account_members')
    .select('owner_id, role')
    .eq('user_id', u.id);
  if (memberships?.length) {
    // Fetch owner names
    const ownerIds = memberships.map(m => m.owner_id);
    const { data: owners } = await admin
      .from('user_profiles')
      .select('id, name, email')
      .in('id', ownerIds);
    const ownerMap = Object.fromEntries((owners || []).map(o => [o.id, o]));
    for (const m of memberships) {
      const owner = ownerMap[m.owner_id];
      accounts.push({
        id: m.owner_id,
        name: owner?.name || owner?.email || 'Unknown',
        role: m.role,
      });
    }
  }

  res.json({
    id: u.id,
    name: p?.name || u.user_metadata?.full_name || '',
    email: p?.email || u.email || '',
    image: p?.image || u.user_metadata?.avatar_url || '',
    role: req.effectiveRole,
    accounts,
    activeAccount: req.accountId,
  });
});

app.post('/api/auth/tokens', auth, async (req, res) => {
  const { provider_token, provider_refresh_token } = req.body;
  await req.supabase.from('user_profiles').update({
    google_access_token: provider_token,
    google_refresh_token: provider_refresh_token,
  }).eq('id', req.user.id);
  res.json({ success: true });
});

// ── API: MEMBERS (RBAC) ───────────────────────────────────────────────────────
app.get('/api/members', auth, requireRole('admin'), async (req, res) => {
  const admin = adminSupabase();
  const { data, error } = await admin
    .from('account_members')
    .select('*')
    .eq('owner_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  // Enrich with user profile info where user_id is linked
  const linked = (data || []).filter(m => m.user_id);
  let profileMap = {};
  if (linked.length) {
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('id, name, email, image')
      .in('id', linked.map(m => m.user_id));
    profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  }

  res.json((data || []).map(m => ({
    ...m,
    profile: m.user_id ? profileMap[m.user_id] || null : null,
  })));
});

app.post('/api/members', auth, requireRole('admin'), async (req, res) => {
  const { email, role } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  // Can't add yourself
  const userEmail = req.profile?.email || req.user.email;
  if (email.trim().toLowerCase() === userEmail?.toLowerCase()) {
    return res.status(400).json({ error: "You can't add yourself as a member" });
  }


  const admin = adminSupabase();

  // Check if email is already a Supabase user, link user_id if so
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const matchedUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());

  const row = {
    owner_id: req.user.id,
    email: email.trim().toLowerCase(),
    role,
    user_id: matchedUser?.id || null,
  };
  const { data, error } = await admin.from('account_members').insert(row).select().single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'This email is already a member' });
    return res.status(500).json({ error: error.message });
  }

  // Send invitation email
  if (resend) {
    const ownerName = req.profile?.name || req.user.email;
    const roleName = { family_contributor: 'Family — Contributor', family_view: 'Family — View Only', non_family_view: 'Non-Family — View Only' }[role] || role;
    try {
      await resend.emails.send({
        from: 'Superplot <onboarding@resend.dev>',
        to: email.trim().toLowerCase(),
        subject: `${ownerName} invited you to their property vault`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 0">
            <h2 style="color:#1a1a2e;margin:0 0 8px">You're invited to Superplot</h2>
            <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px">
              <strong>${ownerName}</strong> has invited you to access their property vault as <strong>${roleName}</strong>.
            </p>
            <a href="${APP_URL}/sign-in" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:500;font-size:15px">
              Sign in to Superplot
            </a>
            <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;line-height:1.5">
              Sign in with your Google account (<strong>${email.trim()}</strong>) to get started.
              If you weren't expecting this invitation, you can ignore this email.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Failed to send invite email:', emailErr);
      // Don't fail the request — member was already added
    }
  }

  res.status(201).json(data);
});

app.patch('/api/members/:id', auth, requireRole('admin'), async (req, res) => {
  const { role } = req.body;
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const admin = adminSupabase();
  const { data, error } = await admin
    .from('account_members')
    .update({ role })
    .eq('id', req.params.id)
    .eq('owner_id', req.user.id)
    .select()
    .single();
  if (error || !data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.delete('/api/members/:id', auth, requireRole('admin'), async (req, res) => {
  const admin = adminSupabase();
  const { error } = await admin
    .from('account_members')
    .delete()
    .eq('id', req.params.id)
    .eq('owner_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── API: PROPERTIES ────────────────────────────────────────────────────────────
const VALID_STATUSES = ['owned', 'jointly_owned', 'leased', 'inherited', 'under_dispute'];

// Extract lat/lng from a Google Maps URL (handles short links too)
async function extractCoordsFromMapsUrl(url) {
  if (!url) return null;
  let resolved = url;
  // Resolve short URLs (maps.app.goo.gl, goo.gl/maps)
  if (/goo\.gl/i.test(url)) {
    try {
      const r = await fetch(url, { redirect: 'manual' });
      resolved = r.headers.get('location') || url;
    } catch { return null; }
  }
  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  ];
  for (const p of patterns) {
    const m = resolved.match(p);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

function bodyToDbRow(body) {
  const row = {};
  const map = {
    name: 'name', address: 'address', zipCode: 'zip_code', googleMapsUrl: 'google_maps_url',
    latitude: 'latitude', longitude: 'longitude', sizeSqFt: 'size_sq_ft', sizeAcres: 'size_acres',
    purchaseDate: 'purchase_date', ownershipStatus: 'ownership_status', isRented: 'is_rented',
    monthlyRent: 'monthly_rent', renteeContact: 'rentee_contact', purchasePrice: 'purchase_price',
    currentPrice: 'current_price',
  };
  for (const [k, dbk] of Object.entries(map)) {
    if (body[k] !== undefined) row[dbk] = body[k];
  }
  return row;
}

app.get('/api/properties', auth, async (req, res) => {
  const admin = adminSupabase();
  const { data, error } = await admin
    .from('properties')
    .select('*, documents(*)')
    .eq('owner_id', req.accountId)
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/properties', auth, requireRole('admin'), async (req, res) => {
  const { name, address, zipCode, ownershipStatus } = req.body;
  if (!name?.trim() || !address?.trim() || !zipCode?.trim())
    return res.status(400).json({ error: 'name, address, zipCode are required' });
  if (!VALID_STATUSES.includes(ownershipStatus))
    return res.status(400).json({ error: 'Invalid ownership status' });

  const row = bodyToDbRow(req.body);

  // Auto-extract coordinates from Google Maps URL if not provided
  if (row.google_maps_url && !row.latitude && !row.longitude) {
    const coords = await extractCoordsFromMapsUrl(row.google_maps_url);
    if (coords) { row.latitude = coords.lat; row.longitude = coords.lng; }
  }

  row.owner_id = req.user.id;
  const admin = adminSupabase();
  const { data, error } = await admin.from('properties').insert(row).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.get('/api/properties/:id', auth, async (req, res) => {
  const property = await resolveProperty(req.params.id, req.accountId);
  if (!property) return res.status(404).json({ error: 'Not found' });
  res.json(property);
});

app.patch('/api/properties/:id', auth, requireRole('admin'), async (req, res) => {
  const property = await resolveProperty(req.params.id, req.accountId);
  if (!property) return res.status(404).json({ error: 'Not found' });
  const realId = property.id;
  const row = bodyToDbRow(req.body);
  if (row.ownership_status && !VALID_STATUSES.includes(row.ownership_status))
    return res.status(400).json({ error: 'Invalid ownership status' });

  // Auto-extract coordinates from Google Maps URL if changed and coords not set
  if (row.google_maps_url && !row.latitude && !row.longitude && !property.latitude) {
    const coords = await extractCoordsFromMapsUrl(row.google_maps_url);
    if (coords) { row.latitude = coords.lat; row.longitude = coords.lng; }
  }

  // Rename or create Drive folder when property name changes (fire-and-forget)
  const nameChanged = row.name && row.name !== property.name;
  const driveFolderId = property.g_drive_folder_id;
  const newName = row.name;
  const accountId = req.accountId;

  const admin = adminSupabase();
  const { data, error } = await admin.from('properties').update(row).eq('id', realId).select().single();
  if (error || !data) return res.status(404).json({ error: error?.message || 'Not found' });
  res.json(data);

  // After responding, handle Drive folder in background
  if (nameChanged) {
    (async () => {
      try {
        const accessToken = await getGoogleAccessToken(adminSupabase(), accountId);
        if (driveFolderId) {
          await driveRenameFolder(accessToken, driveFolderId, newName);
          console.log(`  ↳ Renamed Drive folder ${driveFolderId} → "${newName}"`);
        } else {
          const rootFolder = await driveGetOrCreateFolder(accessToken, GDRIVE_ROOT, null);
          const newFolder = await driveCreateFolder(accessToken, newName, rootFolder.id);
          await adminSupabase().from('properties').update({ g_drive_folder_id: newFolder.id }).eq('id', realId);
          console.log(`  ↳ Created Drive folder "${newName}" (${newFolder.id})`);
        }
      } catch (e) {
        console.error('Drive folder rename/create failed:', e.message);
      }
    })();
  }
});

app.delete('/api/properties/:id', auth, requireRole('admin'), async (req, res) => {
  const property = await resolveProperty(req.params.id, req.accountId);
  if (!property) return res.status(404).json({ error: 'Not found' });
  const realId = property.id;

  // Fetch documents for Drive file IDs
  const admin = adminSupabase();
  const { data: docs } = await admin.from('documents').select('g_drive_file_id').eq('property_id', realId);

  // Delete all files and the folder from Google Drive
  try {
    const accessToken = await getGoogleAccessToken(adminSupabase(), req.accountId);

    // Delete each document file from Drive
    const driveFiles = (docs || []).filter(d => d.g_drive_file_id);
    await Promise.all(driveFiles.map(async (d) => {
      try {
        const r = await fetch(`https://www.googleapis.com/drive/v3/files/${d.g_drive_file_id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!r.ok) console.error('Drive file delete failed:', r.status, await r.text());
      } catch (e) { console.error('Drive file delete error:', e.message); }
    }));

    // Delete the property folder from Drive
    if (property?.g_drive_folder_id) {
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${property.g_drive_folder_id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!r.ok) console.error('Drive folder delete failed:', r.status, await r.text());
      else console.log('Deleted Drive folder:', property.g_drive_folder_id);
    }
  } catch (err) {
    console.error('Drive cleanup failed:', err.message);
  }

  // Delete property from DB (documents cascade via FK)
  const { error } = await admin.from('properties').delete().eq('id', realId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── API: DOCUMENTS ─────────────────────────────────────────────────────────────
app.post('/api/documents/upload', auth, upload.single('file'), async (req, res) => {
  if (req.effectiveRole === 'family_view' || req.effectiveRole === 'non_family_view')
    return res.status(403).json({ error: 'View-only users cannot upload' });

  const file = req.file;
  const { propertyId, docType } = req.body;
  if (!file || !propertyId || !docType)
    return res.status(400).json({ error: 'file, propertyId, docType required' });

  // Verify property belongs to active account
  let property;
  const admin = adminSupabase();
  const { data } = await admin.from('properties').select('*').eq('id', propertyId).eq('owner_id', req.accountId).single();
  property = data;
  if (!property) return res.status(404).json({ error: 'Property not found' });

  let driveFileId, viewUrl, folderId;

  try {
    const accessToken = await getGoogleAccessToken(adminSupabase(), req.accountId);
    console.log('[upload] Got access token, finding/creating root folder:', GDRIVE_ROOT);
    const rootFolder = await driveGetOrCreateFolder(accessToken, GDRIVE_ROOT, null);
    console.log('[upload] Root folder:', rootFolder.id, '- finding/creating property folder:', property.name);
    const propFolder = await driveGetOrCreateFolder(accessToken, property.name, rootFolder.id);
    console.log('[upload] Property folder:', propFolder.id, '- uploading file:', file.originalname);
    folderId = propFolder.id;
    const uploaded = await driveUpload(accessToken, file.originalname, file.mimetype, file.buffer, propFolder.id);
    console.log('[upload] File uploaded:', uploaded.id);
    driveFileId = uploaded.id;
    viewUrl = `https://drive.google.com/file/d/${uploaded.id}/view`;
  } catch (err) {
    console.error('[upload] Drive error:', err);
    return res.status(500).json({ error: 'Drive upload failed: ' + err.message });
  }

  const doc = {
    property_id: propertyId,
    type: docType,
    file_name: file.originalname,
    g_drive_file_id: driveFileId,
    view_url: viewUrl,
    uploaded_by: req.user.id,
  };

  const { data: inserted, error } = await adminSupabase().from('documents').insert(doc).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (!property.g_drive_folder_id && folderId) {
    await adminSupabase().from('properties').update({ g_drive_folder_id: folderId }).eq('id', propertyId);
  }
  res.json(inserted);
});

app.delete('/api/documents/:id', auth, async (req, res) => {
  if (req.effectiveRole === 'family_view' || req.effectiveRole === 'non_family_view')
    return res.status(403).json({ error: 'View-only users cannot delete' });
  const { id } = req.params;

  try {
    const { data: doc } = await adminSupabase().from('documents').select('g_drive_file_id').eq('id', id).single();

    if (doc?.g_drive_file_id) {
      try {
        const accessToken = await getGoogleAccessToken(adminSupabase(), req.accountId);
        const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.g_drive_file_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log('Drive delete response:', driveRes.status, driveRes.statusText);
        if (!driveRes.ok) console.error('Drive delete failed:', driveRes.status, await driveRes.text());

        // Verify deletion
        const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.g_drive_file_id}?fields=id,trashed`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log('Post-delete check:', checkRes.status, checkRes.status === 404 ? '(confirmed gone)' : await checkRes.text());
      } catch (err) {
        console.error('Drive delete error:', err.message);
      }
    }

    const { error } = await adminSupabase().from('documents').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('Document delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── API: SEARCH ────────────────────────────────────────────────────────────────
app.get('/api/search', auth, async (req, res) => {
  const q = (req.query.q || '').trim();
  const missing = (req.query.missing || '').trim();

  let query = adminSupabase().from('properties').select('*, documents(*)').eq('owner_id', req.accountId);
  if (q) {
    query = query.or(`name.ilike.%${q}%,address.ilike.%${q}%,zip_code.ilike.%${q}%`);
  }
  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  let results = data || [];
  if (missing) {
    const scoredTypes = ['encumbrance_certificate','certified_sale_deed','pahani_ror1b','survey_map','bhu_bharati_ec','pattadhar_passbook','property_report','property_tax_receipt','cdma_property_tax_receipt','building_permission','land_use_certificate','mortgage_report','vaastu_report','rera_certificate','sale_deed_receipt'];
    if (missing === 'any') {
      results = results.filter(p => {
        const types = new Set((p.documents || []).map(d => d.type));
        return scoredTypes.some(t => !types.has(t));
      });
    } else {
      results = results.filter(p => !(p.documents || []).some(d => d.type === missing));
    }
  }
  res.json(results);
});

// ── VITE DEV / STATIC PROD ────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, async () => {
    console.log(`\n  Superplot running at http://localhost:${PORT}\n`);

    // Backfill lat/lng for properties with Google Maps URLs but no coordinates
    try {
      const admin = adminSupabase();
      const { data: props } = await admin
        .from('properties')
        .select('id, google_maps_url')
        .not('google_maps_url', 'is', null)
        .is('latitude', null);
      if (props?.length) {
        for (const p of props) {
          const coords = await extractCoordsFromMapsUrl(p.google_maps_url);
          if (coords) {
            await admin.from('properties').update({ latitude: coords.lat, longitude: coords.lng }).eq('id', p.id);
            console.log(`  ↳ Backfilled coords for property ${p.id}: ${coords.lat}, ${coords.lng}`);
          }
        }
      }
    } catch (e) { console.error('Coord backfill failed:', e.message); }
  });
}

export default app;
