# Superplot: Product Requirements Document

**Version**: 1.0.0

**Date**: April 19, 2026

**Public URL**: https://superplot.vercel.app

**Repository**: github.com/SVirat/Superplot


---

## 1. Product Overview

Superplot is a **private, self-hosted web application** for cataloging real estate properties and storing legal documentation securely via Google Drive. It is designed for an Indian household managing a portfolio of properties (flats, farms, villas, land) with an emphasis on tracking 15+ types of Indian legal/property documents per property.

**Target users**: A single family — one admin (property owner) and optionally invited family members with varying access levels (contributor or view-only).

**Key value proposition**: A single dashboard to see all properties, which legal documents have been collected for each, upload/store documents securely in the user's own Google Drive, and track documentation completeness.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Runtime | Node.js | Single-process server |
| Server | Express 4.21 | API routes + Vite dev middleware |
| Bundler | Vite 5.4 | Dev server with HMR, React plugin |
| Frontend | React 18 + React Router 6 | SPA with lazy-loaded routes |
| Auth | Supabase Auth | PKCE flow, Google OAuth |
| Database | Supabase Postgres | RLS policies, service role key for admin ops |
| File Storage | Google Drive API | User's own Drive, `drive.file` scope |
| Email | Resend | Member invitation emails |
| Icons | lucide-react | |
| Fonts | Inter (Google Fonts) | |
| Theme | Light glassmorphism, CSS custom properties | |
| Maps | Google Maps Embed + Street View Static API | Property previews |
| Hosting | Vercel | Serverless functions + static SPA |

**No TypeScript. No Next.js. No Tailwind. Pure CSS with custom properties.**

---

## 3. User Roles & Permissions (RBAC)

The app uses a multi-account RBAC system. Each user has their own account by default. Users can be invited to other accounts as members with specific roles.

| Role | Description | View Properties | Upload Docs | Edit/Delete Properties | Manage Members |
|------|-------------|-----------------|-------------|------------------------|----------------|
| `admin` | Account owner | Yes | Yes | Yes | Yes |
| `family_contributor` | Family member with upload rights | Yes | Yes | No | No |
| `family_view` | Family member, read-only | Yes | No | No | No |
| `non_family_view` | External viewer, read-only | Yes | No | No | No |

**Role labels for display**:
- admin → "Admin"
- family_contributor → "Family — Contributor"
- family_view → "Family — View Only"
- non_family_view → "Non-Family — View Only"

### 3.1 Multi-Account Support
- Users can belong to multiple accounts (their own + others they've been invited to)
- An **account switcher** in the sidebar lets users switch between accounts
- The active account ID is sent via `X-Account-Id` header on every API request
- The server resolves the effective role based on the `account_members` table

---

## 4. Authentication

### 4.1 Sign-In
- **Single sign-in method**: Google OAuth only
- Supabase Auth handles the OAuth flow using **PKCE** (Proof Key for Code Exchange)
- OAuth scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/drive.file`
- OAuth parameters: `access_type: offline`, `prompt: consent` (to get refresh token)
- Sign-in page: app branding ("Superplot") + "Continue with Google" button

### 4.2 Auth Callback
- After Google OAuth redirect, the app exchanges the code for a session
- The `provider_token` (Google access token) and `provider_refresh_token` are persisted to `user_profiles` via `POST /api/auth/tokens`
- A `user_profiles` row is auto-created on signup via a database trigger

### 4.3 Session Management
- `auth` middleware on every API route validates the JWT via `sb.auth.getUser(token)`
- User profile is cached in-memory for 30 seconds to reduce DB round-trips on rapid sequential requests
- Resolves active account and effective role from `account_members` table
- Pending invitations are auto-linked by email on `/api/user` (login), not on every request

### 4.4 Sign-Out
- Signs out via Supabase client, redirects to `/sign-in`

---

## 5. Database Schema

### 5.1 `user_profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | References `auth.users(id)`, cascade delete |
| name | TEXT | From Google metadata |
| email | TEXT | NOT NULL |
| image | TEXT | Google avatar URL |
| role | TEXT | Default: `admin` |
| google_access_token | TEXT | For Drive API |
| google_refresh_token | TEXT | For Drive API |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### 5.2 `properties`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Default: `gen_random_uuid()` |
| name | TEXT | NOT NULL. Property nickname |
| address | TEXT | NOT NULL. Full address |
| zip_code | TEXT | Default: empty string |
| google_maps_url | TEXT | Optional Google Maps link |
| latitude | FLOAT8 | Auto-extracted from Maps URL |
| longitude | FLOAT8 | Auto-extracted from Maps URL |
| size_sq_ft | FLOAT8 | Optional |
| size_acres | FLOAT8 | Optional |
| purchase_date | DATE | Optional |
| ownership_status | TEXT | One of: `owned`, `jointly_owned`, `leased`, `inherited`, `under_dispute` |
| is_rented | BOOLEAN | Default: `false` |
| monthly_rent | FLOAT8 | Optional, in ₹ |
| rentee_contact | TEXT | Optional |
| purchase_price | FLOAT8 | Optional, in ₹ |
| current_price | FLOAT8 | Optional, in ₹ |
| g_drive_folder_id | TEXT | Google Drive folder ID (set lazily on first upload) |
| owner_id | UUID | NOT NULL. References `auth.users(id)` |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### 5.3 `documents`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Default: `gen_random_uuid()` |
| property_id | UUID | FK → `properties(id)` CASCADE DELETE |
| type | TEXT | NOT NULL. Document type key (see Section 6) |
| file_name | TEXT | NOT NULL. Original filename |
| g_drive_file_id | TEXT | NOT NULL. Google Drive file ID |
| view_url | TEXT | NOT NULL. Google Drive view URL |
| uploaded_by | UUID | FK → `auth.users(id)` |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### 5.4 `account_members`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Default: `gen_random_uuid()` |
| owner_id | UUID | FK → `auth.users(id)` CASCADE DELETE |
| email | TEXT | NOT NULL. Invited member's email |
| user_id | UUID | FK → `auth.users(id)`. Nullable (linked on first login) |
| role | TEXT | `family_contributor`, `family_view`, or `non_family_view` |
| created_at | TIMESTAMPTZ | Auto |

**Unique constraint**: `(owner_id, email)` — prevents duplicate invitations.

### 5.5 Row-Level Security (RLS)
- **user_profiles**: Users can SELECT/UPDATE only their own row
- **properties**: Full CRUD only for rows where `owner_id = auth.uid()`
- **documents**: Full CRUD only for documents whose parent property is owned by `auth.uid()`
- **account_members**: Owner can manage all; members can view their own membership
- All tables have RLS enabled with `FORCE ROW LEVEL SECURITY`

### 5.6 Indexes
- `idx_properties_owner` on `properties(owner_id)`
- `idx_documents_property` on `documents(property_id)`
- `idx_account_members_owner` on `account_members(owner_id)`
- `idx_account_members_email` on `account_members(email)`
- `idx_account_members_user` on `account_members(user_id)`

### 5.7 Triggers
- **Auto-create user profile on signup**: `on_auth_user_created` trigger on `auth.users` → inserts into `user_profiles` using `raw_user_meta_data`
- **Auto-update `updated_at`**: Trigger on `properties`, `documents`, and `user_profiles` sets `updated_at = NOW()` before update

---

## 6. Document Types

The system tracks **17 document types** per property. Each type has a machine key, a human-readable label, and a tooltip describing the document:

| Key | Label |
|-----|-------|
| `encumbrance_certificate` | Encumbrance Certificate |
| `certified_sale_deed` | Certified Sale Deed |
| `pahani_ror1b` | Pahani / ROR 1B |
| `survey_map` | Survey Map |
| `bhu_bharati_ec` | Bhu Bharati EC |
| `pattadhar_passbook` | Pattadhar Passbook |
| `property_report` | Property Report |
| `property_tax_receipt` | Property Tax Receipt |
| `cdma_property_tax_receipt` | CDMA Property Tax Receipt |
| `building_permission` | Building Permission |
| `land_use_certificate` | Land Use Certificate |
| `mortgage_report` | Mortgage Report |
| `vaastu_report` | Vaastu Report |
| `rera_certificate` | RERA Certificate |
| `sale_deed_receipt` | Sale Deed Receipt |
| `other` | Other |
| `photos` | Photos |

**Documentation Score**: `(unique scored types uploaded) / 15 × 100`. "other" and "photos" are excluded from scoring.

### Ownership Statuses
| Key | Label |
|-----|-------|
| `owned` | Owned |
| `jointly_owned` | Jointly Owned |
| `leased` | Leased |
| `inherited` | Inherited |
| `under_dispute` | Under Dispute |

---

## 7. Google Drive Integration

### 7.1 Folder Structure
```
My Drive/
  └── Superplot/              ← root folder (configurable via GDRIVE_ROOT_FOLDER_NAME)
      ├── Hyderabad Flat/     ← one folder per property (using property name)
      │   ├── sale_deed.pdf
      │   ├── tax_receipt.pdf
      │   └── photo1.jpg
      └── Ancestral Farm/
          └── pahani.pdf
```

### 7.2 Upload Flow
1. Get access token for the account owner (refreshes expired tokens automatically)
2. Get-or-create root folder ("Superplot")
3. Get-or-create property subfolder (using property name)
4. Upload file via multipart upload
5. Store `g_drive_file_id` and `view_url` on the document row
6. Store `g_drive_folder_id` on the property row (if not already set)

### 7.3 Upload UX
- **XHR-based upload** with real-time progress tracking
- **Multi-stage progress indicator**: Preparing → Sending file (with %) → Uploading to Google Drive → Saving to database → Complete
- **Drag-and-drop** file selection with visual feedback
- For photos: multi-file picker + folder picker for bulk upload
- Sequential upload with "Uploading 2 of 5..." counter

### 7.4 File Deletion
- Deleting a document from the app **also deletes the file from Google Drive** (permanent deletion, not trashed)
- The server fetches the `g_drive_file_id` from the DB and issues a Drive API delete before removing the DB row

### 7.5 Folder Sync on Rename
- When a property name is edited, the corresponding Google Drive folder is **renamed** to match
- If no Drive folder exists yet, a new one is **created** under the root folder
- This operation runs asynchronously after the API response to avoid blocking the UI
- The `g_drive_folder_id` is updated in the DB

### 7.6 Property Deletion
- When a property is deleted, the entire Google Drive folder (and all files inside) is deleted
- Each individual document file is also explicitly deleted from Drive

### 7.7 File Access
- Files are always **appended** (never overwrite)
- The app only has access to files it creates (`drive.file` scope)
- View URLs: `https://drive.google.com/file/d/{fileId}/view`

---

## 8. Google Maps Integration

### 8.1 Coordinate Extraction
- When a Google Maps URL is provided for a property, the server automatically **extracts latitude/longitude**
- Supports shortened URLs (`maps.app.goo.gl/...`) by following the redirect to get the full URL
- Parses `@lat,lng` from the resolved URL
- Runs on property creation, update, and as a **backfill on server startup** for properties with URLs but no coordinates

### 8.2 Map Previews (MapPreview Component)
Used on both property cards (dashboard/properties page) and the property detail page.

**Priority order**:
1. **Street View photo**: If `GOOGLE_MAPS_API_KEY` is set and Street View imagery exists at the coordinates → shows a Street View Static API image
2. **Google Maps embed**: If no Street View coverage → shows a Google Maps satellite embed iframe
3. **MapPin icon**: If no coordinates available → shows a placeholder icon

**Street View check**: Uses the `/metadata` endpoint to verify coverage before rendering the image.

---

## 9. Pages & Navigation

### 9.1 App Shell
- **Sidebar** (desktop, left side): Navigation items + account switcher + Settings pinned to bottom
- **Mobile Nav**: Hamburger menu with same items
- **Header** (top bar): User avatar dropdown with name/email/sign-out
- **Main content area**: Scrollable, padded

### 9.2 Navigation Items
| Icon | Label | Route | Notes |
|------|-------|-------|-------|
| LayoutDashboard | Dashboard | `/` | |
| Building2 | Properties | `/properties` | |
| Search | Search | `/search` | |
| Shield | Access Control | `/access` | Admin only (hidden for non-admins) |
| Settings | Settings | `/settings` | Pinned to sidebar bottom |

### 9.3 Account Switcher
- Shown in sidebar when user belongs to multiple accounts
- Dropdown with account names and roles
- Switching accounts updates localStorage and re-fetches user data

### 9.4 URL Slugification
- Property detail URLs use **name-based slugs** instead of UUIDs
- e.g., `/properties/hyderabad-flat` instead of `/properties/2f9dae7d-...`
- `slugify()` converts names to lowercase, replaces non-alphanumeric chars with hyphens
- Server resolves both UUIDs and slugs via `resolveProperty()`

### 9.5 Page: Landing (`/`)
- **Public page** shown to unauthenticated users; authenticated users see the Dashboard
- **Glassmorphism design**: Frosted-glass cards, animated gradient orbs, blue accent palette
- **Fixed nav**: Logo (left), section nav tabs — Features, How it Works, Highlights (right), Sign In button (far right). Nav tabs smooth-scroll to the corresponding section
- **Hero section**: Headline, subtitle, "Get Started with Google" CTA, animated dashboard mockup
  - **Dashboard mockup**: Interactive 4-tab animation (Dashboard, Properties, Search, Access) auto-cycling every 3.5s with fade transitions. Clicking a tab stops auto-cycle. Each tab shows realistic mock content (stats grid, property detail view, search with preview, access members with activity feed)
- **Features section** (`#features`): 4-card grid — Document Vault, Google Drive Storage, Family Access, Property Tracking
- **How it Works section** (`#how-it-works`): 3-step timeline with SVG illustrations — Sign in with Google, Add Properties, Upload Documents
- **Highlights section** (`#highlights`): Two alternating highlight cards with visuals — "Every property, every document, one dashboard" and "15+ Indian property document types, built in"
- **Social proof**: Trust indicators (families, documents, availability metrics)
- **CTA section** (`#cta`): Compact card with "Ready to organize your property portfolio?" heading and Google sign-in button
- **Footer**: Logo, copyright, links to Privacy Policy and Terms & Conditions

### 9.6 Page: Sign-In (`/sign-in`)
- Centered card with app branding ("Superplot")
- Single "Continue with Google" button
- Redirects to dashboard on successful auth

### 9.7 Page: Dashboard (`/`)
- **Stats row** (3 cards): Properties count, Documents uploaded, Completion percentage
- **Property Grid**: Responsive grid of property cards
- "Add Property" button (hidden for non-admins)

### 9.8 Page: Properties (`/properties`)
- Same grid as dashboard with "Add Property" button

### 9.9 Page: Property Detail (`/properties/:id`)
- **Header**: Back button, property name, address, Edit/Delete buttons (admin only)
- **Left Rail**:
  - Map preview (Street View / embed / placeholder) — clickable, opens Google Maps
  - Details card: ZIP, ownership, size, prices, rental info, Google Maps link
  - Documentation Score: progress bar with percentage
- **Main Area**:
  - Document Vault: DocumentList component with all 17 types
  - Photos grid: Thumbnails with hover overlay, upload/delete controls

### 9.10 Page: Edit Property (`/properties/:id/edit`)
- PropertyForm pre-filled with existing data
- On save, navigates to the updated slug URL

### 9.11 Page: Search (`/search`)
- Text search (name, address, ZIP) + "Missing Document" dropdown filter
- URL-driven with `?q=...&missing=...` query params
- Results as property grid with count

### 9.12 Page: Access Control (`/access`)
- **Admin view**:
  - Invite form: email input + role select + "Send Invite" button
  - People with access: Owner row (non-removable) + member rows with role select + remove button
  - Invitation emails sent via Resend
- **Non-admin view**: Read-only message explaining only the owner can manage access

### 9.13 Page: Settings (`/settings`)
- Google Drive connection info
- Account details (read-only)

---

## 10. Components

### 10.1 PropertyForm
4 card sections: Property Identity, Location, Property Details, Rental Information.

**Key fields**: Name (required), Address (required), ZIP (required), Ownership Status, Google Maps URL, Size, Prices, Rental toggle with conditional rent/tenant fields.

### 10.2 PropertyCard
- **Map preview** (MapPreview component): Street View / embed / icon
- **Document completion badge**: Top-right overlay with color coding (green/yellow/gray)
- **Property name and address** (truncated)
- **Progress bar**: Documentation completion
- **Document dots**: 15 colored dots showing upload status per type, with tooltips
- **Footer**: Ownership badge + ZIP code
- Entire card links to `/properties/{slug}`

### 10.3 MapPreview (Shared Component)
Used in PropertyCard and PropertyDetail. Renders:
1. Street View Static API image (if API key + coverage exist)
2. Google Maps satellite embed iframe (fallback)
3. Placeholder with MapPin icon (no coordinates)

### 10.4 DocumentList / DocumentSlot
Per document type row with:
- Status icon (green check / gray alert) with tooltip describing the document type
- Expandable file list with View (Drive link) and Delete buttons
- Upload button per slot

### 10.5 UploadDialog
Modal with drag-and-drop, file/folder picker, multi-stage progress, sequential upload for multiple files.

### 10.6 PropertyGrid
Responsive grid: 1 col → 2 col → 3 col → 4 col. Empty state with "No properties yet" prompt.

### 10.7 Sidebar
- Navigation links with active state highlighting
- Account switcher dropdown (multi-account)
- Settings pinned to bottom with `margin-top: auto`
- Access Control hidden for non-admin roles

---

## 11. API Endpoints

| Method | Route | Auth | Role Required | Description |
|--------|-------|------|---------------|-------------|
| GET | `/api/config` | No | — | Returns Supabase URL, anon key, Maps API key |
| GET | `/api/user` | Yes | — | Current user + accounts list |
| POST | `/api/auth/tokens` | Yes | — | Save Google OAuth tokens |
| GET | `/api/properties` | Yes | — | List properties for active account |
| POST | `/api/properties` | Yes | admin | Create property |
| GET | `/api/properties/:id` | Yes | — | Get property with documents (supports slug or UUID) |
| PATCH | `/api/properties/:id` | Yes | admin | Update property (also renames Drive folder if name changed) |
| DELETE | `/api/properties/:id` | Yes | admin | Delete property + Drive folder + all Drive files |
| POST | `/api/documents/upload` | Yes | admin, contributor | Upload document to Drive |
| DELETE | `/api/documents/:id` | Yes | admin, contributor | Delete document from DB + Drive |
| GET | `/api/search` | Yes | — | Search properties by name/address/ZIP/missing docs |
| GET | `/api/members` | Yes | admin | List account members |
| POST | `/api/members` | Yes | admin | Invite member (sends email via Resend) |
| PATCH | `/api/members/:id` | Yes | admin | Update member role |
| DELETE | `/api/members/:id` | Yes | admin | Remove member |

---

## 12. Email Invitations

- When an admin adds a member, an **invitation email** is sent via Resend
- Email includes: inviter's name, the app URL, and instructions to sign in with Google
- On first login, pending invitations are **auto-linked** by matching the member's email
- Requires a verified custom domain on Resend for arbitrary recipient addresses (free tier only sends to account owner's email)

---

## 13. UI/UX Specifications

### 13.1 Theme
- **Light glassmorphism** with CSS custom properties (no Tailwind)
- Frosted-glass cards with `backdrop-filter: blur` and semi-transparent backgrounds
- Primary color: Blue accent (`#2563EB`)
- Background: Light blue-gray (`#F8FAFF`) with animated gradient orbs
- Font: **Inter** (Google Fonts)
- Border radius: `0.625rem` default

### 13.2 Currency
- All monetary values in **Indian Rupees (₹)**
- `en-IN` locale formatting (lakh/crore grouping)

### 13.3 Date Format
- `en-IN` locale, medium format: "18 Apr 2026"

### 13.4 Responsive Design
- Mobile-first
- Sidebar visible at `lg` breakpoint (~1024px)
- Property grid: 1 → 2 → 3 → 4 columns
- Property detail: Stacked → side-by-side at `lg`

### 13.5 Loading States
- Every page has skeleton loading matching the final layout
- Animated pulse effect

### 13.6 Optimistic Updates
- Document deletion: Immediately hidden from UI, API call in background, reverts on failure
- Property deletion: Navigates to `/properties` immediately

---

## 14. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS for admin operations) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GDRIVE_ROOT_FOLDER_NAME` | No | Root Drive folder name. Default: `"Superplot"` |
| `RESEND_API_KEY` | No | Resend API key for invitation emails |
| `APP_URL` | No | App URL for email links. Default: `http://localhost:3000` |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps API key for Street View previews |

---

## 15. Legal Pages

### 15.1 Privacy Policy (`docs/PRIVACY_POLICY.md`)
- Data collection: account info, property metadata, documents stored in user's own Drive, OAuth tokens
- No third-party sharing, no ads, no analytics
- RLS security model, `drive.file` scope
- GDPR-style user rights

### 15.2 Terms and Conditions (`docs/TERMS_AND_CONDITIONS.md`)
- Service provided as-is
- User retains ownership of all data
- Limitation of liability

---

## 16. Route Map

| Route | Type | Auth | Description |
|-------|------|------|-------------|
| `/sign-in` | Page | No | Sign-in page |
| `/auth/callback` | Page | No | OAuth callback handler |
| `/` | Page | No | Landing page (unauthenticated) / Dashboard (authenticated) |
| `/properties` | Page | Yes | Property listing |
| `/properties/new` | Page | Yes | Add property form |
| `/properties/:id` | Page | Yes | Property detail (slug or UUID) |
| `/properties/:id/edit` | Page | Yes | Edit property form |
| `/search` | Page | Yes | Search with filters |
| `/access` | Page | Yes | Access control / member management |
| `/settings` | Page | Yes | Settings (read-only) |

---

## 17. Deployment (Vercel)

The app deploys to **Vercel** as a static SPA + serverless API function.

### 17.1 Architecture
- **Frontend**: Vite builds the React SPA to `dist/`. Vercel serves it as static files.
- **API**: All Express routes are exported from `server.js` and re-exported via `api/index.js` as a single Vercel serverless function.
- **Routing**: `vercel.json` rewrites `/api/*` to the serverless function and all other paths to `index.html` (SPA fallback).

### 17.2 Environment Detection
- On Vercel, `process.env.VERCEL` is set to `'1'` automatically.
- When running on Vercel, `server.js` skips Vite middleware, static file serving, and `app.listen()`.
- Environment variables are read from `process.env` (set in Vercel dashboard), not from a `.env` file.

### 17.3 Vercel Settings
- **Framework Preset**: Other
- **Build Command**: `npx vite build`
- **Output Directory**: `dist`
- All environment variables from `.env.example` must be set in Vercel dashboard → Settings → Environment Variables.
- `APP_URL` should be set to `https://superplot.vercel.app`.

### 17.4 Limitations
- Serverless function timeout: 10s (free) / 60s (Pro). Large uploads may be affected.
- Function body size limit: ~4.5MB (free tier). Multer memory buffer may hit this for large files.
- Coordinate backfill only runs on local server startup (not on Vercel).

---

## 18. File Structure

```
Superplot/
├── server.js                         # Express server + all API routes (exports app for serverless)
├── package.json
├── vite.config.js
├── vercel.json                       # Vercel deployment config (rewrites, function settings)
├── index.html                        # SPA entry point
├── .env                              # Environment variables (not committed)
├── .env.example                      # Template
├── .gitignore                        # Ignores node_modules, dist, .env
├── README.md                         # Setup & usage guide
├── LICENSE.md                        # Proprietary license
├── api/
│   └── index.js                      # Vercel serverless entry point (re-exports Express app)
├── docs/
│   ├── PRD.md                        # This document
│   ├── PRIVACY_POLICY.md
│   └── TERMS_AND_CONDITIONS.md
├── supabase/
│   └── migrations/
│       └── 001_create_tables.sql     # Full schema (4 tables + RLS + triggers)
└── src/
    ├── App.jsx                       # React Router setup, lazy-loaded routes
    ├── main.jsx                      # React DOM entry
    ├── index.css                     # All styles (dark theme, components, responsive)
    ├── lib/
    │   ├── api.js                    # API client with auth headers, XHR upload
    │   ├── auth.jsx                  # Auth context (user, signIn, signOut, activeAccount, switchAccount)
    │   ├── constants.js              # Doc types, roles, ownership statuses, utilities
    │   ├── format.js                 # Currency, date, number formatters
    │   └── supabase.js               # Supabase client init, config fetching
    ├── components/
    │   ├── DocumentList.jsx          # Document vault with expandable slots
    │   ├── Header.jsx                # Top bar with user avatar dropdown
    │   ├── MapPreview.jsx            # Street View / embed / placeholder (shared)
    │   ├── PropertyCard.jsx          # Property card for grid views
    │   ├── PropertyForm.jsx          # Add/edit property form
    │   ├── PropertyGrid.jsx          # Responsive property card grid
    │   ├── Sidebar.jsx               # Navigation + account switcher
    │   └── UploadDialog.jsx          # Upload modal with drag-drop + progress
    └── pages/
        ├── Access.jsx                # Member management (RBAC)
        ├── AuthCallback.jsx          # OAuth callback handler
        ├── Dashboard.jsx             # Stats + property grid
        ├── Properties.jsx            # Property listing
        ├── PropertyDetail.jsx        # Property deep-dive
        ├── PropertyEdit.jsx          # Edit property wrapper
        ├── PropertyNew.jsx           # New property wrapper
        ├── Search.jsx                # Search with filters
        ├── Settings.jsx              # Settings page
        └── SignIn.jsx                # Sign-in page
```
# PropertyVault — Product Requirements Document

**Version**: 1.0.0
**Date**: April 18, 2026
**Public URL**: superplot.vercel.app
**Repository**: github.com/SVirat/Superplot

---

## 1. Product Overview

PropertyVault is a **private, self-hosted web application** for cataloging real estate properties and storing legal documentation securely via Google Drive. It is designed for an Indian household managing a portfolio of properties (flats, farms, villas, land) with an emphasis on tracking 15+ types of Indian legal/property documents per property.

**Target users**: A single family — one admin (property owner) and optionally invited family members with view-only or contributor access.

**Key value proposition**: A single dashboard to see all properties, which legal documents have been collected for each, upload/store documents securely in the user's own Google Drive, and track documentation completeness.

---

## 2. Tech Stack (Previous → New)

| Layer | Previous (v1) | Notes for Rebuild |
|-------|---------------|-------------------|
| Framework | Next.js 15.3.1 + TypeScript | User wants NO TypeScript, NO Next.js |
| UI | React 19, Tailwind CSS v4, Shadcn/UI (Radix) | — |
| Auth | Supabase Auth (Google OAuth) | — |
| Database | Supabase Postgres with RLS | — |
| File Storage | Google Drive API (user's own Drive) | — |
| Hosting | Vercel | — |
| Icons | lucide-react | — |
| Fonts | Inter (Google Fonts) | — |
| Theme | Dark mode default, oklch color space | — |

---

## 3. User Roles & Permissions

| Role | Description | Can View | Can Upload | Can Edit/Delete | Can Manage Users |
|------|-------------|----------|------------|-----------------|------------------|
| `admin` | Property owner | All properties | Yes | Yes | Yes |
| `family_contributor` | Family member with upload rights | All properties | Yes | No | No |
| `family_view` | Family member with read-only access | All properties | No | No | No |

**Role labels for display**:
- admin → "Admin (Owner)"
- family_view → "Family — View Only"
- family_contributor → "Family — Contributor"

---

## 4. Authentication

### 4.1 Sign-In
- **Single sign-in method**: Google OAuth only
- Supabase Auth handles the OAuth flow
- OAuth scopes requested: `openid`, `email`, `profile`, **`https://www.googleapis.com/auth/drive.file`** (for Google Drive access to app-created files only)
- OAuth parameters: `access_type: offline`, `prompt: consent` (to get refresh token)
- Sign-in page shows app branding ("PropertyVault") + description + single "Continue with Google" button with Google logo

### 4.2 Auth Callback
- After Google OAuth redirect, the app exchanges the code for a session
- The `provider_token` (Google access token) and `provider_refresh_token` (Google refresh token) are persisted to the `user_profiles` table for later Google Drive API usage
- A `user_profiles` row is auto-created on signup via a database trigger (pulls `full_name`, `email`, `avatar_url` from Google metadata, defaults role to `admin`)

### 4.3 Session Management
- Middleware runs on every non-static route to refresh the Supabase session (keeps auth cookies alive)
- Unauthenticated users are redirected to `/sign-in` on any protected page

### 4.4 Sign-Out
- Signs out via Supabase client, redirects to `/sign-in`, refreshes router

---

## 5. Database Schema

### 5.1 `user_profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | References `auth.users(id)`, cascade delete |
| name | TEXT | From Google metadata |
| email | TEXT | NOT NULL |
| image | TEXT | Google avatar URL |
| role | TEXT | `admin`, `family_view`, or `family_contributor`. Default: `admin` |
| google_access_token | TEXT | For Drive API |
| google_refresh_token | TEXT | For Drive API |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### 5.2 `properties`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Default: `gen_random_uuid()` |
| name | TEXT | NOT NULL. Property nickname (e.g., "Hyderabad Flat") |
| address | TEXT | NOT NULL. Full address |
| zip_code | TEXT | Default: empty string |
| google_maps_url | TEXT | Optional Google Maps link |
| latitude | FLOAT8 | Optional |
| longitude | FLOAT8 | Optional |
| size_sq_ft | FLOAT8 | Optional, property size in square feet |
| size_acres | FLOAT8 | Optional, property size in acres |
| purchase_date | DATE | Optional |
| ownership_status | TEXT | NOT NULL. One of: `owned`, `jointly_owned`, `leased`, `inherited`, `under_dispute`. Default: `owned` |
| is_rented | BOOLEAN | Default: `false` |
| monthly_rent | FLOAT8 | Optional, in ₹ (INR) |
| rentee_contact | TEXT | Optional, tenant name/contact |
| purchase_price | FLOAT8 | Optional, in ₹ (INR) |
| current_price | FLOAT8 | Optional, current estimated value in ₹ (INR) |
| g_drive_folder_id | TEXT | Google Drive folder ID for this property's documents |
| owner_id | UUID | NOT NULL. References `auth.users(id)` |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### 5.3 `documents`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Default: `gen_random_uuid()` |
| property_id | UUID | NOT NULL. FK → `properties(id)` CASCADE DELETE |
| type | TEXT | NOT NULL. Document type key (see Section 6) |
| file_name | TEXT | NOT NULL. Original filename |
| g_drive_file_id | TEXT | NOT NULL. Google Drive file ID |
| view_url | TEXT | NOT NULL. Direct Google Drive view URL |
| uploaded_by | UUID | NOT NULL. FK → `auth.users(id)` |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### 5.4 Row-Level Security (RLS)
- **user_profiles**: Users can SELECT/UPDATE only their own row
- **properties**: Full CRUD only for rows where `owner_id = auth.uid()`
- **documents**: Full CRUD only for documents whose parent property is owned by `auth.uid()`
- All tables have RLS enabled with `FORCE ROW LEVEL SECURITY`

### 5.5 Indexes
- `idx_properties_owner` on `properties(owner_id)`
- `idx_documents_property` on `documents(property_id)`

### 5.6 Triggers
- **Auto-create user profile on signup**: `on_auth_user_created` trigger on `auth.users` → inserts into `user_profiles` using `raw_user_meta_data`
- **Auto-update `updated_at`**: Trigger on each table sets `updated_at = NOW()` before update

---

## 6. Document Types

The system tracks **17 document types** per property. Each type has a machine key and a human-readable label:

| Key | Label |
|-----|-------|
| `encumbrance_certificate` | Encumbrance Certificate |
| `certified_sale_deed` | Certified Sale Deed |
| `pahani_ror1b` | Pahani / ROR 1B |
| `survey_map` | Survey Map |
| `bhu_bharati_ec` | Bhu Bharati EC |
| `pattadhar_passbook` | Pattadhar Passbook |
| `property_report` | Property Report |
| `property_tax_receipt` | Property Tax Receipt |
| `cdma_property_tax_receipt` | CDMA Property Tax Receipt |
| `building_permission` | Building Permission |
| `land_use_certificate` | Land Use Certificate |
| `mortgage_report` | Mortgage Report |
| `vaastu_report` | Vaastu Report |
| `rera_certificate` | RERA Certificate |
| `sale_deed_receipt` | Sale Deed Receipt |
| `other` | Other |
| `photos` | Photos |

**Documentation Score**: Calculated as `(number of unique document types uploaded, excluding "other" and "photos") / 15 × 100`. Displayed as a percentage with progress bar.

### Ownership Statuses
| Key | Label |
|-----|-------|
| `owned` | Owned |
| `jointly_owned` | Jointly Owned |
| `leased` | Leased |
| `inherited` | Inherited |
| `under_dispute` | Under Dispute |

---

## 7. Google Drive Integration

### 7.1 Folder Structure
```
My Drive/
  └── PropertyVault/          ← root folder (name configurable via GDRIVE_ROOT_FOLDER_NAME env var)
      ├── Hyderabad Flat/     ← one folder per property (using property name)
      │   ├── sale_deed.pdf
      │   ├── tax_receipt.pdf
      │   └── photo1.jpg
      ├── Ancestral Farm/
      │   └── pahani.pdf
      └── ...
```

### 7.2 Upload Flow
1. Get OAuth2 client for the user (reads `google_access_token` and `google_refresh_token` from `user_profiles`)
2. Auto-refresh expired tokens and persist new tokens back to DB
3. Get-or-create root folder ("PropertyVault")
4. Get-or-create property subfolder (using property name)
5. Upload file with `parents: [propertyFolderId]`
6. Return `{fileId, viewUrl, folderId}`
7. Store `g_drive_folder_id` on the property row (for linking to Drive folder)

### 7.3 File Access
- Files are always **appended** (never overwrite)
- The app only has access to files it creates (`drive.file` scope)
- View URLs link directly to Google Drive (`https://drive.google.com/file/d/{fileId}/view`)
- Folder URLs: `https://drive.google.com/drive/folders/{folderId}`

### 7.4 Accepted File Types for Upload
- **Documents**: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.doc`, `.docx`
- **Photos**: Any image file (`image/*`). Also supports folder picker (`webkitdirectory`) for bulk upload.

---

## 8. Pages & Navigation

### 8.1 App Shell
- **Sidebar** (desktop, left side, 256px wide): 5 navigation items + branding + "Private · Self-hosted" footer
- **Mobile Nav** (hamburger menu, shown below `lg` breakpoint): Same 5 items
- **Header** (desktop, top bar): User avatar dropdown with name/email/sign-out, or "Sign in" button
- **Main content area**: Scrollable, padded

### 8.2 Navigation Items
| Icon | Label | Route |
|------|-------|-------|
| LayoutDashboard | Dashboard | `/` |
| Building2 | Properties | `/properties` |
| Search | Search | `/search` |
| Shield | Access Control | `/access` |
| Settings | Settings | `/settings` |

Active state: Exact match for `/`, `startsWith` match for others.

### 8.3 Page: Sign-In (`/sign-in`)
- Centered card layout
- App branding: "PropertyVault" with Building2 icon
- Description: "Your private property management vault"
- Single "Continue with Google" button with Google SVG logo
- Redirects to dashboard on successful auth

### 8.4 Page: Dashboard (`/`)
- **Auth required** — redirects to `/sign-in` if not authenticated
- **Header row**: "Dashboard" title, "Welcome back, {firstName}" subtitle, "Add Property" button (links to `/properties/new`)
- **Stats row** (3 cards):
  - Properties count (Building2 icon)
  - Documents Uploaded count (FileText icon)
  - Completion percentage (Users icon) — `(totalDocuments / (totalProperties × 15)) × 100`
- **Property Grid**: "Your Properties" heading + responsive grid of property cards

### 8.5 Page: Properties (`/properties`)
- **Auth required**
- **Header row**: "Properties" title, "Manage your real estate portfolio" subtitle, "Add Property" button
- **Property Grid**: Same responsive grid component as dashboard

### 8.6 Page: Add Property (`/properties/new`)
- **Auth required**
- Title: "Add Property"
- Renders the PropertyForm component with no initial data

### 8.7 Page: Property Detail (`/properties/[id]`)
- **Auth required**
- **404** if property not found
- Permissions computed: `isAdmin` (owner + admin role), `canUpload` (admin or contributor), `canDelete` (admin only)
- Renders PropertyDetailView client component (see Section 9.3)

### 8.8 Page: Edit Property (`/properties/[id]/edit`)
- **Auth required**
- **404** if property not found or not owned by current user
- Title: "Edit Property"
- Renders PropertyForm pre-filled with existing property data

### 8.9 Page: Search (`/search`)
- **Auth required**
- Title: "Search" / "Find properties by name, address, ZIP code, or missing documents"
- **GlobalSearch component**: Text input + "Missing Document" dropdown filter
- **Search behavior**: URL-driven with `?q=...&missing=...` query params
- **Text search**: Matches against property name, address, and ZIP code (case-insensitive `ILIKE`)
- **Missing document filter options**:
  - "Any missing document" — shows properties missing at least one document type (excluding "other")
  - Each of the 15 document types — shows properties that DON'T have that specific type
- **Results**: Property grid with result count

### 8.10 Page: Access Control (`/access`)
- **Auth required**
- Title: "Access Control" / "Manage who can access your property vault"
- **Users card**: Lists all users (admin sees all, non-admin sees only self) with name, email, and role badge
- **Invite card** (admin only): Explanatory text about inviting family members — "To invite a family member, add their Google account as a test user in your Google Cloud Console, then share this app link with them."

### 8.11 Page: Settings (`/settings`)
- **Auth required**
- Title: "Settings" / "Application configuration"
- **Google Drive card**: Explains the `drive.file` scope and shows connected email
- **Account card**: Read-only display of name, email, role

### 8.12 Loading States
Every page has a matching loading skeleton with:
- Placeholder rectangles matching the final layout structure
- Animated pulse effect
- Proper sizing to minimize layout shift

---

## 9. Components

### 9.1 PropertyForm
**Used on**: `/properties/new` and `/properties/[id]/edit`

**4 card sections**:

#### Card 1: Property Identity
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Property Nickname | Text input | Yes | e.g., "Hyderabad Flat" |
| Ownership Status | Select dropdown | Yes | Default: "Owned". Options: Owned, Jointly Owned, Leased, Inherited, Under Dispute |
| Purchase Date | Date input | No | HTML date picker |

#### Card 2: Location
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Full Address | Textarea (3 rows) | Yes | Full postal address |
| ZIP / PIN Code | Text input | Yes | Indian PIN code |
| Google Maps URL | URL input | No | Direct link to Google Maps |

#### Card 3: Property Details
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Size (sq ft) | Number input | No | Property area in square feet |
| Size (acres) | Number input, step=0.01 | No | Property area in acres |
| Purchase Price (₹) | Number input | No | In Indian Rupees |
| Current Estimated Price (₹) | Number input | No | In Indian Rupees |

#### Card 4: Rental Information
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Currently Rented? | Checkbox | No | Toggle. When unchecked, rent fields hidden |
| Monthly Rent (₹) | Number input | No | Shown only when rented=true |
| Tenant Contact | Text input | No | Shown only when rented=true |

**Submit behavior**:
- **Create** (`POST /api/properties`): Validates required fields, creates property, redirects to `/properties/{newId}`
- **Edit** (`PATCH /api/properties/{id}`): Updates only changed fields, redirects to `/properties/{id}`
- Shows error alert on failure
- "Creating..." / "Saving..." loading state on button

### 9.2 PropertyCard
Displayed in the property grid. Shows:
- **Map placeholder** (4:3 aspect ratio, muted background with MapPin icon)
- **Document completion badge**: Top-right overlay, shows `{uploaded}/{total}` with color coding:
  - Green (`success` variant) at 100%
  - Yellow (`warning` variant) at > 0%
  - Default at 0%
- **Property name** (bold, truncated)
- **Address** (muted, truncated, with MapPin icon)
- **Progress bar**: Visual documentation completion
- **Document checklist**: Row of small colored dots for each of the 15 document types:
  - Green dot = uploaded
  - Muted dot = missing
  - Shows type label on hover (via tooltip)
- **Footer**: Ownership status badge + ZIP code
- **Click**: Entire card is a link to `/properties/{id}`

### 9.3 PropertyDetailView
Split-panel layout:

**Left Rail (320px on desktop)**:
1. **Map card**: Clickable placeholder that opens Google Maps (uses `googleMapsUrl` or generates from address)
2. **Details card**: Key-value list showing ZIP code, ownership status (badge), size (sq ft), area (acres), purchase date, purchase price (₹), current estimate (₹), rental status + monthly rent + tenant contact (conditional), Google Maps link
3. **Documentation Score card**: `{uploaded}/{total} documents` with percentage and progress bar

**Main Area**:
1. **Document Vault card**: DocumentList component
2. **Photos card**: Grid of photo thumbnails (2/3/4 columns responsive). Each photo has hover overlay with "View in Drive" link and filename. Empty state with upload prompt.

**Header row**: Back button (router.back), property name (h1), address with MapPin icon, Edit button (links to edit page), Delete button (opens confirmation dialog)

**Delete confirmation**: Dialog with property name, warning text, Cancel + Delete buttons. **Optimistic**: Navigates to `/properties` immediately, fires DELETE API in background.

**Document deletion**: Optimistic — removes from UI immediately via `deletedDocIds` Set, fires DELETE API in background.

### 9.4 DocumentList
Renders one DocumentSlot per document type (excluding `photos`). For each type:
- Shows whether any file of that type has been uploaded
- Groups multiple files under the same type

### 9.5 DocumentSlot
Per document type row:
- **Status icon**: Green check (CircleCheck) if at least one file uploaded, gray alert (CircleAlert) if none
- **Type label**: Human-readable document type name
- **File count badge**: Shows number of files if > 1
- **Upload button**: "Upload" (if none) or "Add" (if has files), shown only if `canUpload`
- **Expandable file list**: Each file shows:
  - Filename (truncated)
  - "View" button → opens Google Drive link in new tab
  - "Delete" button → calls `onDelete(docId)`, shown only if `canDelete`

### 9.6 UploadDialog
Modal dialog for file upload:
- **Title**: "Upload {Document Type Label}"
- **Description**: Explains files are appended, not replaced
- **Drag-and-drop zone**: Dashed border, changes color on dragover
- **For documents**: Single file picker. Accepts `.pdf, .jpg, .jpeg, .png, .doc, .docx`
- **For photos**: Multi-file picker + separate "Select Folder" button (uses `webkitdirectory` attribute). Filters to `image/*` files.
- **Sequential upload**: Files uploaded one at a time with progress counter ("Uploading 2 of 5...")
- **On success**: Closes dialog, calls `onSuccess` callback (triggers router.refresh)

### 9.7 GlobalSearch
Search interface:
- **Text input**: Placeholder "Search by name, address, or ZIP code..."
- **"Missing Document" select dropdown**: Options are "Any missing document" + all 15 document types (excluding "other" and "photos")
- **Search button**: Navigates to `/search?q={query}&missing={filter}` via `router.push`
- **URL-driven**: Reads initial values from URL search params

### 9.8 PropertyGrid
Responsive grid layout:
- 1 column (mobile) → 2 columns (sm) → 3 columns (lg) → 4 columns (xl)
- **Empty state**: Centered illustration (Building2 icon) + "No properties yet" text + "Add your first property" link

---

## 10. API Endpoints

### 10.1 `GET /api/properties`
- **Auth**: Required (returns 401)
- **Response**: Array of all properties for the authenticated user, ordered by `updated_at` desc
- **Status**: 200

### 10.2 `POST /api/properties`
- **Auth**: Required, admin only (returns 403 for non-admin)
- **Body** (JSON):
  ```json
  {
    "name": "string (required)",
    "address": "string (required)",
    "zipCode": "string (required)",
    "ownershipStatus": "string (required, must be valid status)",
    "googleMapsUrl": "string (optional)",
    "latitude": "number (optional)",
    "longitude": "number (optional)",
    "sizeSqFt": "number (optional)",
    "sizeAcres": "number (optional)",
    "purchaseDate": "string (optional, date)",
    "isRented": "boolean (optional)",
    "monthlyRent": "number (optional)",
    "renteeContact": "string (optional)",
    "purchasePrice": "number (optional)",
    "currentPrice": "number (optional)"
  }
  ```
- **Validation**: name, address, zipCode must be non-empty. ownershipStatus must be one of the 5 valid values.
- **Response**: Created property object
- **Status**: 201

### 10.3 `GET /api/properties/[id]`
- **Auth**: Required
- **Validation**: Property must exist and be owned by authenticated user (returns 404 otherwise)
- **Response**: Property object with documents array
- **Status**: 200

### 10.4 `PATCH /api/properties/[id]`
- **Auth**: Required, admin only
- **Validation**: Property must exist and be owned by user
- **Body**: Partial property JSON (any subset of fields)
- **Response**: Updated property object
- **Status**: 200

### 10.5 `DELETE /api/properties/[id]`
- **Auth**: Required, admin only
- **Validation**: Property must exist and be owned by user
- **Response**: `{ success: true }`
- **Status**: 200
- **Side effect**: Cascade deletes all associated documents from DB. (Note: Does NOT delete files from Google Drive)

### 10.6 `POST /api/documents/upload`
- **Auth**: Required, `family_view` role blocked (403)
- **Body**: `multipart/form-data` with:
  - `file` — The file to upload (required)
  - `propertyId` — UUID of the property (required)
  - `docType` — Document type key (required)
- **Flow**:
  1. Validates inputs
  2. Verifies property exists and is owned by user
  3. Reads file into buffer
  4. Uploads to Google Drive (or generates mock IDs in test mode)
  5. Creates document row in DB
  6. Stores `g_drive_folder_id` on property if not already set
- **Response**: Document object
- **Status**: 200

### 10.7 `DELETE /api/documents/[id]`
- **Auth**: Required, admin only
- **Response**: `{ success: true }`
- **Status**: 200
- **Side effect**: Deletes document row from DB. (Note: Does NOT delete file from Google Drive)

---

## 11. Test Mode

When `TEST_MODE=true` environment variable is set:
- All database operations use an **in-memory store** instead of Supabase
- Auth returns a hardcoded test user (`id: "test-user-id"`, `name: "Test User"`, `email: "test@propertyvault.local"`, `role: "admin"`)
- Google Drive uploads return mock IDs (`test-drive-{timestamp}`) and mock URLs (`#`)
- **3 seeded properties** are pre-loaded:

#### Test Property 1: "Hyderabad Flat"
- Address: "Flat 301, Cyber Towers, Hi-Tech City, Hyderabad"
- ZIP: "500081", Owned, 1850 sqft
- Purchase date: 2019-06-15
- Rented: yes, ₹25,000/month, tenant: "Ramesh Kumar"
- Purchase price: ₹8,500,000, Current: ₹12,000,000
- 5 documents: certified_sale_deed, property_tax_receipt, encumbrance_certificate, 2 photos

#### Test Property 2: "Ancestral Farm"
- Address: "Survey No. 45, Medchal Village, Rangareddy District"
- ZIP: "501401", Inherited, 5.5 acres
- Not rented, no prices
- 1 document: pahani_ror1b

#### Test Property 3: "Bangalore Villa"
- Address: "Villa 12, Prestige Ozone, Whitefield, Bangalore"
- ZIP: "560066", Jointly Owned, 3200 sqft
- Purchase date: 2022-01-10
- Purchase price: ₹25,000,000, Current: ₹32,000,000
- Not rented, 0 documents

---

## 12. UI/UX Specifications

### 12.1 Theme
- **Dark mode by default** (`<html class="dark">`)
- Color space: oklch
- Primary color: Blue-ish (`oklch(0.685 0.169 237.323)`)
- Background: Dark gray tones
- Sidebar: Separate sidebar theme tokens (sidebar-background, sidebar-foreground, sidebar-primary, sidebar-accent, sidebar-border)
- Border radius: `0.625rem` (default), various sizes for different elements
- Font: **Inter** (Google Fonts)

### 12.2 Currency
- All monetary values displayed in **Indian Rupees (₹)**
- Formatted with `en-IN` locale (lakh/crore grouping: ₹1,25,00,000)

### 12.3 Date Format
- `en-IN` locale, medium format: "18 Apr 2026"

### 12.4 Responsive Breakpoints
- Mobile-first design
- `lg` breakpoint (~1024px): Sidebar becomes visible, mobile nav hides
- Property grid: 1 col → 2 col (sm) → 3 col (lg) → 4 col (xl)
- Property detail: Stacked on mobile → side-by-side at `lg` (320px left rail + flexible main)
- Photo grid: 2 col → 3 col (sm) → 4 col (md)

### 12.5 Loading States
- Every page route has a skeleton loading component
- Skeletons use animated pulse effect on muted backgrounds
- Skeleton shapes match the final layout to minimize content shift

### 12.6 Empty States
- Property grid: Building2 icon + "No properties yet" + link to add
- Photos section: ImageIcon + "No photos uploaded yet" + upload prompt
- Search results: Shows "0 results found"

### 12.7 Optimistic Updates
- Document deletion: Immediately hidden from UI, API call in background
- Property deletion: Immediately navigates to /properties, API call in background

---

## 13. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TEST_MODE` | No | Set to `"true"` to use in-memory test store instead of Supabase/Drive |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (prod) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (prod) | Supabase anonymous key |
| `GOOGLE_CLIENT_ID` | Yes (prod) | Google OAuth client ID (for Drive API) |
| `GOOGLE_CLIENT_SECRET` | Yes (prod) | Google OAuth client secret (for Drive API) |
| `GDRIVE_ROOT_FOLDER_NAME` | No | Root folder name in Drive. Default: `"PropertyVault"` |

---

## 14. Legal Pages

### 14.1 Privacy Policy
- Details data collection: account info, property metadata, documents stored in user's own Drive, OAuth tokens
- No third-party sharing, no ads, no analytics
- RLS security model
- `drive.file` scope — app can only access files it creates
- GDPR-style user rights (access, delete, export)
- Contact: admin@superplot.vercel.app

### 14.2 Terms and Conditions
- Service provided as-is
- User retains ownership of all data
- Limitation of liability
- Third-party dependencies (Google, Supabase, Vercel)
- Admin can terminate access

---

## 15. Known Limitations & Future Considerations

1. **Role assignment is hardcoded**: `getCurrentUser()` always returns `role: "admin"`. Real role assignment from `user_profiles.role` column is not yet implemented.
2. **No file deletion from Google Drive**: Deleting a document only removes the DB row. The file remains in the user's Google Drive.
3. **No image previews**: Photos show a placeholder icon, not actual thumbnails. Users must click "View in Drive" to see the image.
4. **Search uses ILIKE with wildcards**: Leading `%` wildcards prevent index usage. Could use Postgres full-text search or trigram indexes for better performance.
5. **No invitation flow**: The "Invite Family Member" feature only shows instructional text. There's no in-app invite mechanism.
6. **Single-owner model**: Properties are scoped to `owner_id`. Shared properties between family members would require a junction table.
7. **Google Drive folder names are based on property name**: Renaming a property does not rename the Drive folder.

---

## 16. Appendix: Complete Route Map

| Route | Method | Type | Auth | Description |
|-------|--------|------|------|-------------|
| `/` | GET | Page | Yes | Dashboard |
| `/sign-in` | GET | Page | No | Sign-in page |
| `/auth/callback` | GET | API Route | No | OAuth callback handler |
| `/properties` | GET | Page | Yes | Property listing |
| `/properties/new` | GET | Page | Yes | Add property form |
| `/properties/[id]` | GET | Page | Yes | Property detail view |
| `/properties/[id]/edit` | GET | Page | Yes | Edit property form |
| `/search` | GET | Page | Yes | Search with filters |
| `/access` | GET | Page | Yes | Access control / user list |
| `/settings` | GET | Page | Yes | Settings (read-only) |
| `/api/properties` | GET | API | Yes | List properties |
| `/api/properties` | POST | API | Yes (admin) | Create property |
| `/api/properties/[id]` | GET | API | Yes (owner) | Get property |
| `/api/properties/[id]` | PATCH | API | Yes (admin) | Update property |
| `/api/properties/[id]` | DELETE | API | Yes (admin) | Delete property |
| `/api/documents/upload` | POST | API | Yes (not view-only) | Upload document to Drive |
| `/api/documents/[id]` | DELETE | API | Yes (admin) | Delete document record |
