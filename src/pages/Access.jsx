import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { api, useCachedData, CacheKeys } from '../lib/api.js';
import { ROLE_LABELS, MEMBER_ROLES } from '../lib/constants.js';
import { UserPlus, Trash2, Mail, Shield, Users } from 'lucide-react';

export default function Access() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [members, loading, refreshMembers] = useCachedData(
    CacheKeys.members,
    () => isAdmin ? api.getMembers() : Promise.resolve([])
  );
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('family_view');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.addMember(email.trim(), role);
      setSuccess(`Invitation sent to ${email.trim()}`);
      setEmail('');
      refreshMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    try {
      await api.removeMember(id);
      refreshMembers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRoleChange(id, newRole) {
    try {
      await api.updateMemberRole(id, newRole);
      refreshMembers();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-heading" style={{ width: 200 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius)', marginTop: 16 }} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-info">
            <h1>Access Control</h1>
            <p>You are viewing this vault as <strong>{ROLE_LABELS[user?.role] || user?.role}</strong></p>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <Shield size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Only the account owner can manage access permissions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Access Control</h1>
          <p>Manage who can access your property vault</p>
        </div>
      </div>

      {/* Invite member */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3 className="card-title">Invite Member</h3>
          <p className="card-desc">Grant access to family members or trusted individuals</p>
        </div>
        <div className="card-body">
          {error && <div className="form-error">{error}</div>}
          {success && <div className="access-success">{success}</div>}
          <form onSubmit={handleAdd} className="access-form">
            <div className="access-form-fields">
              <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                <label className="form-label">Email address</label>
                <div className="access-input-wrap">
                  <Mail size={16} className="access-input-icon" />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); setSuccess(''); }}
                    required
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                  {MEMBER_ROLES.map(r => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary access-invite-btn" disabled={saving || !email.trim()}>
              <UserPlus size={16} />
              {saving ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
        </div>
      </div>

      {/* People with access */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Users size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />
            People with access
          </h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {/* Owner row */}
          <div className="access-member-row">
            <div className="user-avatar">
              {user?.image ? (
                <img src={user.image} alt={user.name} referrerPolicy="no-referrer" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || '?'
              )}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
            <div className="access-member-role-tag owner">{ROLE_LABELS.admin}</div>
          </div>

          {/* Members */}
          {(members || []).map(m => (
            <div key={m.id} className="access-member-row">
              <div className="user-avatar">
                {m.profile?.image ? (
                  <img src={m.profile.image} alt={m.profile.name} referrerPolicy="no-referrer" />
                ) : (
                  (m.profile?.name || m.email).charAt(0).toUpperCase()
                )}
              </div>
              <div className="user-info">
                <div className="user-name">
                  {m.profile?.name || m.email.split('@')[0]}
                  {!m.user_id && <span className="badge badge-warning" style={{ marginLeft: 6 }}>Pending</span>}
                </div>
                <div className="user-email">{m.email}</div>
              </div>
              <div className="access-member-actions">
                <select
                  className="form-select access-role-select"
                  value={m.role}
                  onChange={e => handleRoleChange(m.id, e.target.value)}
                >
                  {MEMBER_ROLES.map(r => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
                <button
                  className="btn btn-ghost btn-icon access-remove-btn"
                  title="Remove member"
                  onClick={() => handleRemove(m.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {(members || []).length === 0 && (
            <div className="access-empty">
              <p>No members yet — invite someone to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
