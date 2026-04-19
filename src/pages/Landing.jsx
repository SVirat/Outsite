import { useState, useEffect, useRef } from 'react';
import { Building2, Shield, FolderOpen, Users, MapPin, Search, ArrowRight, Check, Lock, Globe, FileText, BarChart3, Home, Eye, Upload, UserPlus, ChevronRight, Sparkles, CircleCheck } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { Navigate } from 'react-router-dom';

const GOOGLE_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const FEATURES = [
  {
    icon: FolderOpen,
    title: 'Document Vault',
    desc: 'Store sale deeds, encumbrance certificates, tax receipts, and 15+ Indian property document types — all in one place.',
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.1)',
  },
  {
    icon: Shield,
    title: 'Your Google Drive',
    desc: 'Files stay in your own Google Drive. No third-party storage, no vendor lock-in. You own your data, always.',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.1)',
  },
  {
    icon: Users,
    title: 'Family Access Control',
    desc: 'Invite family members with fine-grained roles — admin, contributor, or view-only. Everyone sees what they need.',
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.1)',
  },
  {
    icon: MapPin,
    title: 'Property Mapping',
    desc: 'See every property on a map with Google Street View previews. Visualize your portfolio at a glance.',
    color: '#DC2626',
    bg: 'rgba(220, 38, 38, 0.1)',
  },
  {
    icon: Search,
    title: 'Instant Search',
    desc: 'Find any property or document instantly. Filter by type, status, or location — no more digging through folders.',
    color: '#0EA5E9',
    bg: 'rgba(14, 165, 233, 0.1)',
  },
  {
    icon: Lock,
    title: 'Bank-Grade Security',
    desc: 'Supabase authentication with Google OAuth. Row-level security policies ensure data isolation between accounts.',
    color: '#1D4ED8',
    bg: 'rgba(29, 78, 216, 0.1)',
  },
];

const STEPS = [
  { num: '01', title: 'Sign in with Google', desc: 'One click. We use your Google account for secure authentication.', icon: UserPlus, illustration: 'sign-in' },
  { num: '02', title: 'Add your properties', desc: 'Enter details — address, type, value. Flats, villas, farms, and more.', icon: Home, illustration: 'property' },
  { num: '03', title: 'Upload documents', desc: 'Drop files and they sync directly to your Google Drive, auto-organized.', icon: Upload, illustration: 'upload' },
];

function StepIllustration({ type }) {
  if (type === 'sign-in') return (
    <svg viewBox="0 0 240 160" fill="none" className="landing-step-svg">
      <rect x="20" y="12" width="200" height="136" rx="16" fill="#F0F7FF"/>
      <rect x="48" y="24" width="144" height="112" rx="12" fill="#fff" stroke="#E2E8F0" strokeWidth="1.2"/>
      <circle cx="120" cy="60" r="22" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1"/>
      <g transform="translate(108,48) scale(1)">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </g>
      <rect x="72" y="96" width="96" height="24" rx="12" fill="#2563EB"/>
      <text x="120" y="112" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif">Sign in with Google</text>
    </svg>
  );
  if (type === 'property') return (
    <svg viewBox="0 0 240 160" fill="none" className="landing-step-svg">
      <rect x="20" y="16" width="200" height="128" rx="16" fill="#F0FDF4"/>
      {/* Card 1 */}
      <rect x="32" y="32" width="80" height="96" rx="10" fill="#fff" stroke="#E2E8F0" strokeWidth="1.2"/>
      <rect x="32" y="32" width="80" height="36" rx="10" fill="#059669" opacity="0.12"/>
      <path d="M62 42l10-7 10 7v10H62z" fill="#059669" opacity="0.35"/>
      <rect x="40" y="76" width="48" height="4" rx="2" fill="#D1FAE5"/>
      <rect x="40" y="84" width="32" height="3" rx="1.5" fill="#A7F3D0"/>
      <rect x="40" y="92" width="56" height="8" rx="4" fill="#ECFDF5"/>
      <rect x="40" y="92" width="38" height="8" rx="4" fill="#059669" opacity="0.2"/>
      <text x="58" y="99" fill="#059669" fontSize="5.5" fontWeight="600">3 docs</text>
      {/* Card 2 */}
      <rect x="128" y="32" width="80" height="96" rx="10" fill="#fff" stroke="#E2E8F0" strokeWidth="1.2"/>
      <rect x="128" y="32" width="80" height="36" rx="10" fill="#2563EB" opacity="0.1"/>
      <path d="M158 42l10-7 10 7v10h-20z" fill="#2563EB" opacity="0.3"/>
      <rect x="136" y="76" width="48" height="4" rx="2" fill="#DBEAFE"/>
      <rect x="136" y="84" width="32" height="3" rx="1.5" fill="#BFDBFE"/>
      <rect x="136" y="92" width="56" height="8" rx="4" fill="#EFF6FF"/>
      <rect x="136" y="92" width="24" height="8" rx="4" fill="#2563EB" opacity="0.2"/>
      <text x="148" y="99" fill="#2563EB" fontSize="5.5" fontWeight="600">1 doc</text>
      {/* Plus floating */}
      <circle cx="120" cy="140" r="0" fill="none"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 240 160" fill="none" className="landing-step-svg">
      <rect x="20" y="16" width="200" height="128" rx="16" fill="#EFF6FF"/>
      {/* File list */}
      <rect x="32" y="32" width="104" height="20" rx="6" fill="#fff" stroke="#DBEAFE" strokeWidth="1"/>
      <circle cx="44" cy="42" r="5" fill="#2563EB" opacity="0.15"/>
      <path d="M42 42l1.8 1.8 3.4-3.4" stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="54" y="39" width="52" height="3" rx="1.5" fill="#BFDBFE"/>
      <rect x="54" y="44" width="32" height="2" rx="1" fill="#DBEAFE"/>
      <rect x="32" y="58" width="104" height="20" rx="6" fill="#fff" stroke="#DBEAFE" strokeWidth="1"/>
      <circle cx="44" cy="68" r="5" fill="#2563EB" opacity="0.15"/>
      <path d="M42 68l1.8 1.8 3.4-3.4" stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="54" y="65" width="44" height="3" rx="1.5" fill="#BFDBFE"/>
      <rect x="54" y="70" width="28" height="2" rx="1" fill="#DBEAFE"/>
      <rect x="32" y="84" width="104" height="20" rx="6" fill="#fff" stroke="#FDE68A" strokeWidth="1"/>
      <circle cx="44" cy="94" r="5" fill="#F59E0B" opacity="0.15"/>
      <rect x="54" y="91" width="40" height="3" rx="1.5" fill="#FDE68A"/>
      <rect x="54" y="96" width="24" height="2" rx="1" fill="#FEF3C7"/>
      {/* Upload zone */}
      <rect x="148" y="32" width="60" height="72" rx="10" fill="#fff" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="5 4"/>
      <path d="M178 56v-10m0 0l-5 5m5-5l5 5" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="178" y="76" textAnchor="middle" fill="#2563EB" fontSize="7" fontWeight="500" opacity="0.6">Drop files</text>
      {/* Progress */}
      <rect x="32" y="112" width="104" height="6" rx="3" fill="#DBEAFE"/>
      <rect x="32" y="112" width="70" height="6" rx="3" fill="#2563EB"/>
      <text x="32" y="128" fill="#2563EB" fontSize="6.5" fontWeight="600" opacity="0.7">2 of 3 uploaded</text>
    </svg>
  );
}

/* ── Inline SVG visuals ─────────────────────────────────────────────── */

const MOCKUP_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'properties', label: 'Properties', icon: Building2 },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'access', label: 'Access', icon: Users },
];

function MockupDashboardContent() {
  return (
    <>
      <div className="landing-mockup-stats">
        <div className="landing-mockup-stat">
          <div className="landing-mockup-stat-num">12</div>
          <div className="landing-mockup-stat-label">Properties</div>
        </div>
        <div className="landing-mockup-stat">
          <div className="landing-mockup-stat-num">47</div>
          <div className="landing-mockup-stat-label">Documents</div>
        </div>
        <div className="landing-mockup-stat">
          <div className="landing-mockup-stat-num">84%</div>
          <div className="landing-mockup-stat-label">Complete</div>
        </div>
      </div>
      <div className="landing-mockup-cards">
        <div className="landing-mockup-card">
          <div className="landing-mockup-card-img">
            <img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=200&fit=crop&auto=format" alt="Villa" loading="lazy" />
          </div>
          <div className="landing-mockup-card-info">
            <strong>Whitefield Villa</strong>
            <span>Bangalore · Villa</span>
          </div>
          <div className="landing-mockup-card-progress">
            <div className="landing-mockup-card-bar"><div style={{ width: '85%' }} /></div>
            <span className="landing-mockup-card-pct">85%</span>
          </div>
        </div>
        <div className="landing-mockup-card">
          <div className="landing-mockup-card-img">
            <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=200&fit=crop&auto=format" alt="Apartment" loading="lazy" />
          </div>
          <div className="landing-mockup-card-info">
            <strong>Jubilee Hills Flat</strong>
            <span>Hyderabad · Apartment</span>
          </div>
          <div className="landing-mockup-card-progress">
            <div className="landing-mockup-card-bar"><div style={{ width: '60%' }} /></div>
            <span className="landing-mockup-card-pct">60%</span>
          </div>
        </div>
        <div className="landing-mockup-card">
          <div className="landing-mockup-card-img">
            <img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=200&fit=crop&auto=format" alt="Farm land" loading="lazy" />
          </div>
          <div className="landing-mockup-card-info">
            <strong>Farm Plot</strong>
            <span>Shamshabad · Land</span>
          </div>
          <div className="landing-mockup-card-progress">
            <div className="landing-mockup-card-bar"><div style={{ width: '40%' }} /></div>
            <span className="landing-mockup-card-pct">40%</span>
          </div>
        </div>
      </div>
    </>
  );
}

function MockupPropertiesContent() {
  return (
    <div className="mockup-tab-propdetail">
      {/* Header */}
      <div className="mockup-pd-header">
        <ChevronRight size={10} className="mockup-pd-back" />
        <div className="mockup-pd-header-info">
          <strong>Whitefield Villa</strong>
          <span><MapPin size={8} /> Bangalore, Karnataka</span>
        </div>
        <span className="mockup-pd-type-badge">Villa</span>
      </div>
      {/* Two-column layout */}
      <div className="mockup-pd-layout">
        {/* Left rail */}
        <div className="mockup-pd-rail">
          <div className="mockup-pd-map">
            <img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=300&h=160&fit=crop&auto=format" alt="Villa" loading="lazy" />
          </div>
          <div className="mockup-pd-details">
            <div className="mockup-pd-kv"><span>Ownership</span><strong>Self</strong></div>
            <div className="mockup-pd-kv"><span>Size</span><strong>3,200 sq ft</strong></div>
            <div className="mockup-pd-kv"><span>Purchase Price</span><strong>₹1.8 Cr</strong></div>
            <div className="mockup-pd-kv"><span>Current Est.</span><strong>₹2.4 Cr</strong></div>
            <div className="mockup-pd-kv"><span>Purchase Date</span><strong>Mar 2021</strong></div>
          </div>
          <div className="mockup-pd-score">
            <div className="mockup-pd-score-head"><span>Doc Score</span><strong>85%</strong></div>
            <div className="mockup-pd-score-bar"><div style={{ width: '85%' }} /></div>
          </div>
        </div>
        {/* Right main */}
        <div className="mockup-pd-main">
          <div className="mockup-pd-vault-title"><FileText size={10} /> Document Vault</div>
          {[
            { name: 'Sale Deed', done: true, files: 2 },
            { name: 'Encumbrance Certificate', done: true, files: 1 },
            { name: 'Property Tax Receipt', done: true, files: 3 },
            { name: 'Khata Certificate', done: false, files: 0 },
            { name: 'Building Permission', done: true, files: 1 },
            { name: 'Survey Map', done: false, files: 0 },
            { name: 'Pahani / ROR 1B', done: true, files: 1 },
          ].map((d, i) => (
            <div className={`mockup-pd-doc-slot${d.done ? ' done' : ' pending'}`} key={i}>
              {d.done ? <CircleCheck size={9} /> : <span className="mockup-pd-doc-empty" />}
              <span className="mockup-pd-doc-label">{d.name}</span>
              {d.done && <span className="mockup-pd-doc-count">{d.files}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockupSearchContent() {
  return (
    <div className="mockup-tab-search">
      <div className="mockup-search-bar">
        <Search size={12} />
        <span className="mockup-search-typed">Sale Deed</span>
        <span className="mockup-search-shortcut">⌘K</span>
      </div>
      <div className="mockup-search-body">
        <div className="mockup-search-list">
          {[
            { name: 'Sale Deed — Whitefield Villa', prop: 'Whitefield Villa', type: 'PDF', active: true },
            { name: 'Sale Deed — Jubilee Hills', prop: 'Jubilee Hills Flat', type: 'PDF', active: false },
            { name: 'Sale Agreement Draft', prop: 'Farm Plot', type: 'DOC', active: false },
          ].map((d, i) => (
            <div className={`mockup-search-doc${d.active ? ' active' : ''}`} key={i}>
              <FileText size={10} />
              <div className="mockup-search-doc-info">
                <strong>{d.name}</strong>
                <span>{d.prop} · {d.type}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mockup-search-preview">
          <img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=200&h=100&fit=crop&auto=format" alt="" loading="lazy" />
          <strong>Whitefield Villa</strong>
          <span><MapPin size={7} /> Bangalore</span>
          <div className="mockup-search-preview-tags">
            <span className="mockup-tag green"><Check size={7} /> Verified</span>
            <span className="mockup-tag blue">PDF</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupAccessContent() {
  return (
    <div className="mockup-tab-access">
      <div className="mockup-access-header">
        <strong>Family Access</strong>
        <span className="mockup-access-badge"><Lock size={8} /> Secure</span>
      </div>
      <div className="mockup-access-body">
        <div className="mockup-access-members">
          {[
            { name: 'Virat S.', email: 'virat@gmail.com', role: 'Owner', color: '#2563EB', initial: 'V' },
            { name: 'Priya S.', email: 'priya@gmail.com', role: 'Editor', color: '#059669', initial: 'P' },
            { name: 'Raj K.', email: 'raj@gmail.com', role: 'Viewer', color: '#D97706', initial: 'R' },
          ].map((u, i) => (
            <div className="mockup-access-row" key={i}>
              <div className="mockup-access-avatar" style={{ background: u.color }}>{u.initial}</div>
              <div className="mockup-access-info">
                <strong>{u.name}</strong>
                <span>{u.email}</span>
              </div>
              <span className="mockup-access-role-badge" style={{ background: `${u.color}15`, color: u.color }}>{u.role}</span>
            </div>
          ))}
        </div>
        <div className="mockup-access-panel">
          <div className="mockup-access-panel-title">Recent Activity</div>
          <div className="mockup-activity-item"><span className="mockup-activity-dot" style={{ background: '#059669' }} /><span>Priya uploaded <strong>Sale Deed</strong></span><em>2h</em></div>
          <div className="mockup-activity-item"><span className="mockup-activity-dot" style={{ background: '#D97706' }} /><span>Raj viewed <strong>Farm Plot</strong></span><em>5h</em></div>
          <div className="mockup-activity-item"><span className="mockup-activity-dot" style={{ background: '#2563EB' }} /><span>You added <strong>Koramangala</strong></span><em>1d</em></div>
          <div className="mockup-access-invite">
            <UserPlus size={9} />
            <span>Invite member</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroDashboardMockup() {
  const [activeTab, setActiveTab] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef(null);
  const autoCycleRef = useRef(true);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!autoCycleRef.current) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveTab(prev => (prev + 1) % MOCKUP_TABS.length);
        setIsTransitioning(false);
      }, 300);
    }, 3500);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleTabClick = (i) => {
    if (i === activeTab) return;
    autoCycleRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(i);
      setIsTransitioning(false);
    }, 300);
  };

  const tabContent = [
    <MockupDashboardContent key="dashboard" />,
    <MockupPropertiesContent key="properties" />,
    <MockupSearchContent key="search" />,
    <MockupAccessContent key="access" />,
  ];

  return (
    <div className="landing-mockup">
      <div className="landing-mockup-chrome">
        <div className="landing-mockup-dots">
          <span /><span /><span />
        </div>
        <div className="landing-mockup-url">superplot.vercel.app</div>
      </div>
      <div className="landing-mockup-body">
        <div className="landing-mockup-sidebar">
          <div className="landing-mockup-brand">
            <img src="/icons/icon.png" alt="Superplot" style={{ width: 14, height: 14 }} />
            <span>Superplot</span>
          </div>
          {MOCKUP_TABS.map((tab, i) => (
            <div
              key={tab.key}
              className={`landing-mockup-nav-item${i === activeTab ? ' active' : ''}`}
              onClick={() => handleTabClick(i)}
            >
              <tab.icon size={12} /><span>{tab.label}</span>
            </div>
          ))}
        </div>
        <div className="landing-mockup-main">
          <div className={`mockup-tab-content ${isTransitioning ? 'mockup-fade-out' : 'mockup-fade-in'}`}>
            {tabContent[activeTab]}
          </div>
        </div>
      </div>
      <div className="mockup-tab-progress">
        {MOCKUP_TABS.map((tab, i) => (
          <div key={tab.key} className={`mockup-tab-dot${i === activeTab ? ' active' : ''}`} />
        ))}
      </div>
    </div>
  );
}

function PropertyCardVisual() {
  return (
    <div className="landing-prop-visual">
      <div className="landing-prop-card-mock">
        <div className="landing-prop-card-hero">
          <img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=300&fit=crop&auto=format" alt="Whitefield Villa" loading="lazy" className="landing-prop-card-img" />
          <div className="landing-prop-card-gradient" />
          <div className="landing-prop-card-type-badge">Villa</div>
          <div className="landing-prop-card-overlay-info">
            <strong>Whitefield Villa</strong>
            <span>Bangalore, Karnataka</span>
          </div>
        </div>
        <div className="landing-prop-card-body">
          <div className="landing-prop-card-meta">
            <div><FileText size={14} /> <span>12 of 17 docs</span></div>
            <div><MapPin size={14} /> <span>Whitefield</span></div>
          </div>
          <div className="landing-prop-card-progress">
            <div className="landing-prop-card-progress-bar">
              <div style={{ width: '71%' }} />
            </div>
            <span>71% complete</span>
          </div>
          <div className="landing-prop-card-docs-mini">
            <div className="mini-doc done"><CircleCheck size={12} /> Sale Deed</div>
            <div className="mini-doc done"><CircleCheck size={12} /> EC</div>
            <div className="mini-doc done"><CircleCheck size={12} /> Tax Receipt</div>
            <div className="mini-doc pending"><Eye size={12} /> Khata</div>
          </div>
        </div>
      </div>
      {/* Floating accent card */}
      <div className="landing-float-card landing-float-upload">
        <Upload size={16} />
        <div>
          <strong>Secure Upload</strong>
          <span>To your Google Drive</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { signIn, user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing">
      {/* ── ANIMATED BACKGROUND ORBS ─────────────────────────── */}
      <div className="landing-bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <img src="/icons/icon.png" alt="Superplot" className="landing-logo-img" />
            <span>Superplot</span>
          </div>
          <div className="landing-nav-links">
            {[
              { label: 'Features', to: 'features' },
              { label: 'How it Works', to: 'how-it-works' },
              { label: 'Highlights', to: 'highlights' },
            ].map(l => (
              <a
                key={l.to}
                href={`#${l.to}`}
                className="landing-nav-link"
                onClick={e => {
                  e.preventDefault();
                  document.getElementById(l.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {l.label}
              </a>
            ))}
          </div>
          <button className="landing-nav-cta" onClick={signIn}>
            Sign In
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="landing-hero" id="hero">
        <div className="landing-hero-inner">
          <h1 className="landing-h1">
            Your property empire,<br />
            <span className="landing-h1-accent">beautifully organized.</span>
          </h1>
          <p className="landing-hero-sub">
            Superplot is the private vault for your real estate portfolio. Catalog every property, 
            store every legal document in your own Google Drive, and share access with family.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-hero-btn" onClick={signIn}>
              {GOOGLE_ICON}
              Get Started with Google
              <ArrowRight size={18} />
            </button>
            <p className="landing-hero-note">Your data stays in your Google Drive</p>
          </div>
        </div>

        {/* ── Dashboard Mockup ─────────────────────────────────── */}
        <div className="landing-hero-visual">
          <HeroDashboardMockup />
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section className="landing-features" id="features">
        <div className="landing-section-inner">
          <p className="landing-overline">Everything you need</p>
          <h2 className="landing-h2">Property management,<br />reimagined for families.</h2>
          <div className="landing-features-grid">
            {FEATURES.map((f) => (
              <div className="landing-feature-card" key={f.title}>
                <div className="landing-feature-icon" style={{ background: f.bg, color: f.color }}>
                  <f.icon size={24} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section className="landing-steps" id="how-it-works">
        <div className="landing-section-inner">
          <p className="landing-overline">How it works</p>
          <h2 className="landing-h2">Up and running in three steps</h2>
          {/* Timeline connector line */}
          <div className="landing-steps-timeline">
            <div className="landing-steps-line" />
          </div>
          <div className="landing-steps-grid">
            {STEPS.map((s, i) => (
              <div className="landing-step" key={s.num}>
                <div className="landing-step-illus">
                  <StepIllustration type={s.illustration} />
                </div>
                <div className="landing-step-badge">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS — Property Card ──────────────────────────── */}
      <section className="landing-highlights" id="highlights">
        <div className="landing-section-inner">
          <div className="landing-highlight-card">
            <div className="landing-highlight-visual">
              <PropertyCardVisual />
            </div>
            <div className="landing-highlight-text">
              <p className="landing-overline">Track everything</p>
              <h2 className="landing-h2">Every property. Every document. One dashboard.</h2>
              <p className="landing-highlight-desc">See documentation completeness at a glance with visual progress bars. Know exactly which documents are uploaded and which are still pending — for every property in your portfolio.</p>
              <ul className="landing-check-list">
                <li><Check size={18} /> Visual completion tracking</li>
                <li><Check size={18} /> Automatic Google Drive organization</li>
                <li><Check size={18} /> Photo galleries with Street View</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS — Document Types ──────────────────────────── */}
      <section className="landing-highlights alt">
        <div className="landing-section-inner">
          <div className="landing-highlight-card reverse">
            <div className="landing-highlight-text">
              <p className="landing-overline">Built for India</p>
              <h2 className="landing-h2">15+ Indian property document types, built in.</h2>
              <p className="landing-highlight-desc">From sale deeds to encumbrance certificates, we know exactly which documents matter for Indian property ownership.</p>
              <ul className="landing-check-list">
                <li><Check size={18} /> Sale Deed & Title Deed</li>
                <li><Check size={18} /> Encumbrance Certificate</li>
                <li><Check size={18} /> Khata Certificate & Extract</li>
                <li><Check size={18} /> Property Tax Receipts</li>
                <li><Check size={18} /> Completion & Occupancy Certificate</li>
                <li><Check size={18} /> Power of Attorney & Will</li>
              </ul>
            </div>
            <div className="landing-highlight-visual">
              <div className="landing-doc-stack">
                <div className="landing-doc-item">
                  <FolderOpen size={20} />
                  <div>
                    <strong>Sale Deed</strong>
                    <span>Uploaded · PDF · 2.4 MB</span>
                  </div>
                  <span className="landing-doc-badge done">Complete</span>
                </div>
                <div className="landing-doc-item">
                  <FolderOpen size={20} />
                  <div>
                    <strong>Encumbrance Certificate</strong>
                    <span>Uploaded · PDF · 1.1 MB</span>
                  </div>
                  <span className="landing-doc-badge done">Complete</span>
                </div>
                <div className="landing-doc-item">
                  <FolderOpen size={20} />
                  <div>
                    <strong>Property Tax Receipt</strong>
                    <span>Uploaded · PDF · 890 KB</span>
                  </div>
                  <span className="landing-doc-badge done">Complete</span>
                </div>
                <div className="landing-doc-item pending">
                  <FolderOpen size={20} />
                  <div>
                    <strong>Khata Certificate</strong>
                    <span>Not uploaded</span>
                  </div>
                  <span className="landing-doc-badge">Pending</span>
                </div>
                <div className="landing-doc-item pending">
                  <FolderOpen size={20} />
                  <div>
                    <strong>Completion Certificate</strong>
                    <span>Not uploaded</span>
                  </div>
                  <span className="landing-doc-badge">Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="landing-cta" id="cta">
        <div className="landing-section-inner">
          <div className="landing-cta-card">
            <h2 className="landing-h2">Ready to organize your property portfolio?</h2>
            <p className="landing-cta-sub">
              Join families who trust Superplot to keep their property documents safe, organized, and accessible.
            </p>
            <button className="landing-hero-btn" onClick={signIn}>
              {GOOGLE_ICON}
              Continue with Google
              <ArrowRight size={18} />
            </button>
            <p className="landing-hero-note">Your data stays in your Google Drive</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <img src="/icons/icon.png" alt="Superplot" className="landing-logo-img" style={{ width: 22, height: 22 }} />
            <span>Superplot</span>
          </div>
          <div className="landing-footer-links">
            <a href="/docs/PRIVACY_POLICY.md" target="_blank" rel="noopener">Privacy Policy</a>
            <a href="/docs/TERMS_AND_CONDITIONS.md" target="_blank" rel="noopener">Terms & Conditions</a>
          </div>
          <p className="landing-footer-copy">&copy; {new Date().getFullYear()} Superplot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

