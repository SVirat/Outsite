import { useAuth } from '../lib/auth.jsx';
import { ROLE_LABELS } from '../lib/constants.js';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Settings</h1>
          <p>Application configuration</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Google Drive</h3></div>
        <div className="card-body">
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
            Superplot uses the <code>drive.file</code> scope — it can only access files it creates in your Google Drive, inside a folder called "Superplot". No other files in your Drive can be accessed.
          </p>
          <div className="kv-grid">
            <div className="kv-row">
              <span className="kv-label">Connected as</span>
              <span className="kv-value">{user?.email || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Account</h3></div>
        <div className="card-body">
          <div className="kv-grid">
            <div className="kv-row">
              <span className="kv-label">Name</span>
              <span className="kv-value">{user?.name || '—'}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Email</span>
              <span className="kv-value">{user?.email || '—'}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Role</span>
              <span className="kv-value">{ROLE_LABELS[user?.role] || user?.role || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
