import { useState } from 'react';
import { Crown, Zap } from 'lucide-react';
import { api } from '../lib/api.js';

const PLANS = {
  monthly: { id: import.meta.env.VITE_RAZORPAY_PLAN_MONTHLY, label: 'Monthly', price: '₹99', period: '/mo' },
  annual:  { id: import.meta.env.VITE_RAZORPAY_PLAN_ANNUAL, label: 'Annual', price: '₹999', period: '/yr', badge: 'Save 16%' },
};

export default function UpgradeBanner() {
  const [billing, setBilling] = useState('annual');
  const [loading, setLoading] = useState(false);

  const plan = PLANS[billing];

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { subscriptionId } = await api.createSubscription(plan.id);
      // Open Razorpay checkout
      const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!RAZORPAY_KEY) {
        alert('Payment is not configured yet.');
        return;
      }
      const options = {
        key: RAZORPAY_KEY,
        subscription_id: subscriptionId,
        name: 'Superplot',
        description: `${plan.label} Plan`,
        handler: () => {
          // Reload to refresh subscription status
          window.location.reload();
        },
        theme: { color: '#6366f1' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err.message || 'Failed to start payment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="upgrade-banner">
      <div className="upgrade-banner-content">
        <div className="upgrade-banner-icon">
          <Crown size={24} />
        </div>
        <div className="upgrade-banner-text">
          <h3>Upgrade to Premium</h3>
          <p>Unlimited properties, unlimited member invites, and AI-powered insights coming soon.</p>
        </div>
      </div>

      <div className="upgrade-banner-actions">
        <div className="billing-toggle">
          <button
            className={`billing-option ${billing === 'monthly' ? 'active' : ''}`}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            className={`billing-option ${billing === 'annual' ? 'active' : ''}`}
            onClick={() => setBilling('annual')}
          >
            Annual
            {PLANS.annual.badge && <span className="billing-badge">{PLANS.annual.badge}</span>}
          </button>
        </div>

        <div className="upgrade-price">
          <span className="price-amount">{plan.price}</span>
          <span className="price-period">{plan.period}</span>
        </div>

        <button className="btn btn-primary upgrade-btn" onClick={handleUpgrade} disabled={loading}>
          <Zap size={16} />
          {loading ? 'Starting…' : 'Upgrade Now'}
        </button>
      </div>
    </div>
  );
}
