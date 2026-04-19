import { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, XCircle } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';

export default function Header() {
  const { user, signOut, refreshUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggleMobileNav() {
    document.querySelector('.sidebar')?.classList.toggle('open');
    document.querySelector('.mobile-overlay')?.classList.toggle('open');
  }

  async function handleCancelSubscription() {
    setCancelling(true);
    try {
      await api.cancelSubscription();
      if (refreshUser) await refreshUser();
      setConfirmOpen(false);
      setDropdownOpen(false);
    } catch (e) {
      alert(e.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
    <header className="header">
      <div className="header-left">
        <button className="hamburger" onClick={toggleMobileNav}>
          <Menu size={22} />
        </button>
      </div>
      <div className="header-user" ref={ref}>
        {user ? (
          <>
            <button
              className="header-avatar"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ border: 'none' }}
            >
              {user.image ? (
                <img src={user.image} alt={user.name} referrerPolicy="no-referrer" />
              ) : (
                user.name?.charAt(0)?.toUpperCase() || '?'
              )}
            </button>
            {dropdownOpen && (
              <div className="header-dropdown">
                <div className="header-dropdown-info">
                  <div className="name">
                    {user.name}
                    {user.subscription?.isPremium && <span className="pro-badge">PRO</span>}
                  </div>
                  <div className="email">{user.email}</div>
                </div>
                {user.subscription?.isPremium && user.role === 'admin' && (
                  <button
                    onClick={() => { setConfirmOpen(true); setDropdownOpen(false); }}
                  >
                    <XCircle size={14} style={{ marginRight: 8, verticalAlign: -2 }} />
                    Cancel Subscription
                  </button>
                )}
                <button onClick={() => { signOut(); setDropdownOpen(false); }}>
                  <LogOut size={14} style={{ marginRight: 8, verticalAlign: -2 }} />
                  Sign out
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </header>

    {confirmOpen && (
      <div className="confirm-overlay" onClick={() => !cancelling && setConfirmOpen(false)}>
        <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
          <h3>Cancel Subscription</h3>
          <p>Are you sure you want to cancel your subscription? You'll lose access to premium features.</p>
          <div className="confirm-actions">
            <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)} disabled={cancelling}>
              Keep Subscription
            </button>
            <button className="btn btn-danger" onClick={handleCancelSubscription} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
