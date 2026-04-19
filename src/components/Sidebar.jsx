import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Search, Shield, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { ROLE_LABELS } from '../lib/constants.js';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/access', icon: Shield, label: 'Access Control', adminOnly: true },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeAccount, switchAccount } = useAuth();

  const accounts = user?.accounts || [];
  const currentAccount = accounts.find(a => a.id === activeAccount) || accounts[0];

  function isActive(item) {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  }

  function handleSwitch(accountId) {
    switchAccount(accountId);
    setAccountOpen(false);
    navigate('/');
  }

  return (
    <>
      {open && <div className="mobile-overlay open" onClick={() => setOpen(false)} />}
      <nav className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/icons/icon.png" alt="Superplot" style={{ width: 24, height: 24 }} />
          <span>Superplot</span>
        </div>

        {/* Account switcher */}
        {accounts.length > 1 && (
          <div className="account-switcher">
            <button className="account-switcher-btn" onClick={() => setAccountOpen(!accountOpen)}>
              <div className="account-switcher-info">
                <div className="account-switcher-name">{currentAccount?.name || 'My Properties'}</div>
                <div className="account-switcher-role">{ROLE_LABELS[currentAccount?.role] || currentAccount?.role}</div>
              </div>
              <ChevronDown size={14} style={{ transform: accountOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {accountOpen && (
              <div className="account-switcher-dropdown">
                {accounts.map(a => (
                  <button
                    key={a.id}
                    className={`account-switcher-option${a.id === activeAccount ? ' active' : ''}`}
                    onClick={() => handleSwitch(a.id)}
                  >
                    <div className="account-switcher-name">{a.name}</div>
                    <div className="account-switcher-role">{ROLE_LABELS[a.role] || a.role}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="sidebar-nav">
          {NAV.filter(item => !item.adminOnly || user?.role === 'admin').map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={`sidebar-link${isActive(item) ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={`sidebar-link${location.pathname.startsWith('/settings') ? ' active' : ''}`}
            onClick={() => setOpen(false)}
          >
            <Settings size={20} />
            Settings
          </NavLink>
          <div className="sidebar-footer">Private · Self-hosted</div>
        </div>
      </nav>
    </>
  );
}

// Export toggle for header hamburger
export function useSidebarToggle() {
  return () => {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('open');
  };
}
