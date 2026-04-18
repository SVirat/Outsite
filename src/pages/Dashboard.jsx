import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileText, BarChart3, Plus } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { api, useCachedData, CacheKeys } from '../lib/api.js';
import { SCORED_COUNT } from '../lib/constants.js';
import PropertyGrid from '../components/PropertyGrid.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [properties, loading] = useCachedData(CacheKeys.properties, api.getProperties);

  const stats = useMemo(() => {
    const p = properties || [];
    const totalDocs = p.reduce((sum, p) => sum + (p.documents?.length || 0), 0);
    const totalProps = p.length;
    const pct = totalProps ? Math.round((totalDocs / (totalProps * SCORED_COUNT)) * 100) : 0;
    return { totalProps, totalDocs, pct: Math.min(pct, 100) };
  }, [properties]);

  const firstName = user?.name?.split(' ')[0] || 'there';

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-heading" style={{ width: 180 }} />
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius)' }} />)}
        </div>
        <div className="property-grid">
          {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Dashboard</h1>
          <p>Welcome back, {firstName}</p>
        </div>
        {user?.role === 'admin' && (
          <Link to="/properties/new" className="btn btn-primary">
            <Plus size={16} /> Add Property
          </Link>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Building2 size={24} /></div>
          <div>
            <div className="stat-value">{stats.totalProps}</div>
            <div className="stat-label">Properties</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FileText size={24} /></div>
          <div>
            <div className="stat-value">{stats.totalDocs}</div>
            <div className="stat-label">Documents Uploaded</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><BarChart3 size={24} /></div>
          <div>
            <div className="stat-value">{stats.pct}%</div>
            <div className="stat-label">Completion</div>
          </div>
        </div>
      </div>

      <h2 className="section-heading">Your Properties</h2>
      <PropertyGrid properties={properties || []} />
    </div>
  );
}
