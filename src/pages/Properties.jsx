import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { api, useCachedData, CacheKeys } from '../lib/api.js';
import PropertyGrid from '../components/PropertyGrid.jsx';

export default function Properties() {
  const { user } = useAuth();
  const [properties, loading] = useCachedData(CacheKeys.properties, api.getProperties);
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-heading" style={{ width: 160 }} />
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
          <h1>Properties</h1>
          <p>Manage your real estate portfolio</p>
        </div>
        {isAdmin && (
          <Link to="/properties/new" className="btn btn-primary">
            <Plus size={16} /> Add Property
          </Link>
        )}
      </div>
      <PropertyGrid properties={properties || []} />
    </div>
  );
}
