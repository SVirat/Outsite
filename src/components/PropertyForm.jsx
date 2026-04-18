import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OWNERSHIP_STATUSES, slugify } from '../lib/constants.js';
import { api, invalidateProperties, invalidateProperty } from '../lib/api.js';

export default function PropertyForm({ initial }) {
  const navigate = useNavigate();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    name: initial?.name || '',
    ownershipStatus: initial?.ownership_status || 'owned',
    purchaseDate: initial?.purchase_date || '',
    address: initial?.address || '',
    zipCode: initial?.zip_code || '',
    googleMapsUrl: initial?.google_maps_url || '',
    sizeSqFt: initial?.size_sq_ft || '',
    sizeAcres: initial?.size_acres || '',
    purchasePrice: initial?.purchase_price || '',
    currentPrice: initial?.current_price || '',
    isRented: initial?.is_rented || false,
    monthlyRent: initial?.monthly_rent || '',
    renteeContact: initial?.rentee_contact || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.address.trim() || !form.zipCode.trim()) {
      setError('Property name, address, and ZIP code are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        zipCode: form.zipCode.trim(),
        ownershipStatus: form.ownershipStatus,
        googleMapsUrl: form.googleMapsUrl || '',
        purchaseDate: form.purchaseDate || null,
        sizeSqFt: form.sizeSqFt ? Math.round(Number(form.sizeSqFt)) : null,
        sizeAcres: form.sizeAcres ? Number(form.sizeAcres) : null,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        currentPrice: form.currentPrice ? Number(form.currentPrice) : null,
        isRented: form.isRented,
        monthlyRent: form.isRented && form.monthlyRent ? Number(form.monthlyRent) : null,
        renteeContact: form.isRented ? form.renteeContact || null : null,
      };
      if (isEdit) {
        await api.updateProperty(initial.id, payload);
        invalidateProperties();
        invalidateProperty(initial.id);
        navigate(`/properties/${slugify(form.name)}`);
      } else {
        const created = await api.createProperty(payload);
        invalidateProperties();
        navigate(`/properties/${slugify(created.name)}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Property Identity</h3></div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Property Nickname *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., Hyderabad Flat" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ownership Status *</label>
              <select className="form-select" value={form.ownershipStatus} onChange={e => set('ownershipStatus', e.target.value)}>
                {OWNERSHIP_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Purchase Date</label>
              <input type="date" className="form-input" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Location</h3></div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Full Address *</label>
            <textarea className="form-textarea" rows={3} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full postal address" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ZIP / PIN Code *</label>
              <input className="form-input" value={form.zipCode} onChange={e => set('zipCode', e.target.value)} placeholder="e.g., 500081" />
            </div>
            <div className="form-group">
              <label className="form-label">Google Maps URL</label>
              <input type="url" className="form-input" value={form.googleMapsUrl} onChange={e => set('googleMapsUrl', e.target.value)} placeholder="https://maps.google.com/..." />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Property Details</h3></div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Size (sq ft)</label>
              <input type="number" className="form-input" value={form.sizeSqFt} onChange={e => set('sizeSqFt', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Size (acres)</label>
              <input type="number" step="0.01" className="form-input" value={form.sizeAcres} onChange={e => set('sizeAcres', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Purchase Price (₹)</label>
              <input type="number" className="form-input" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Current Estimated Price (₹)</label>
              <input type="number" className="form-input" value={form.currentPrice} onChange={e => set('currentPrice', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3 className="card-title">Rental Information</h3></div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-check">
              <input type="checkbox" checked={form.isRented} onChange={e => set('isRented', e.target.checked)} />
              <span className="form-label" style={{ margin: 0 }}>Currently Rented?</span>
            </label>
          </div>
          {form.isRented && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Monthly Rent (₹)</label>
                <input type="number" className="form-input" value={form.monthlyRent} onChange={e => set('monthlyRent', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Tenant Contact</label>
                <input className="form-input" value={form.renteeContact} onChange={e => set('renteeContact', e.target.value)} placeholder="Tenant name / phone" />
              </div>
            </div>
          )}
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Property')}
      </button>
    </form>
  );
}
