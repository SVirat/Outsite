import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, useCachedData, CacheKeys } from '../lib/api.js';
import PropertyForm from '../components/PropertyForm.jsx';

export default function PropertyEdit() {
  const { id } = useParams();
  const [property, loading] = useCachedData(CacheKeys.property(id), () => api.getProperty(id));

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-heading" style={{ width: 200 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)', marginTop: 16 }} />
      </div>
    );
  }

  if (!property) {
    return <div className="empty-state"><p>Property not found.</p></div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>Edit Property</h1>
      <PropertyForm initial={property} />
    </div>
  );
}
