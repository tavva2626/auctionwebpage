import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUPPORTED_CURRENCIES } from '../utils/auctionStorage';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function MultiItemAuctionCreatePage() {
  usePageTitle('Host - Auction Settings');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [auctionName, setAuctionName] = useState('');
  const [maxBidders, setMaxBidders] = useState('8');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // Prefill if settings exist in session
    const saved = sessionStorage.getItem('pendingMultiAuctionSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) setAuctionName(parsed.name);
        if (parsed.maxBidders) setMaxBidders(String(parsed.maxBidders));
        if (parsed.password) setPassword(parsed.password);
        if (parsed.currency) setCurrency(parsed.currency);
      } catch (e) {
        // ignore
      }
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');

    if (!auctionName.trim()) {
      setError('Auction name is required.');
      return;
    }
    if (!password.trim()) {
      setError('Auction room password is required.');
      return;
    }

    const settings = {
      name: auctionName.trim(),
      maxBidders: Number(maxBidders) || 8,
      password: password.trim(),
      currency: currency,
    };

    sessionStorage.setItem('pendingMultiAuctionSettings', JSON.stringify(settings));
    navigate('/host/multi-add-items');
  };

  return (
    <main className="page" style={{ width: '100%', maxWidth: '100%', padding: '1.25rem 2rem', minHeight: '100vh', boxSizing: 'border-box' }}>
      <header className="page-header" style={{ width: '100%', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem' }}>Auction Settings</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '1rem' }}>
            Configure basic settings for your multi-item auction session.
          </p>
        </div>
        <button className="secondary" onClick={() => navigate('/home')} style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
          Back to Home
        </button>
      </header>

      {/* Main Settings Card (Fit to Whole Page Width) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div className="card" style={{ width: '100%', padding: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '2rem' }}>
            <span style={{ fontSize: '2rem' }}>⚙️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text)' }}>Step 1: Configure Auction</h2>
              <p style={{ margin: '0.2rem 0 0', color: 'var(--muted)', fontSize: '0.95rem' }}>
                Fill in the details below, then click "Create & Add Items" to proceed to item details.
              </p>
            </div>
          </div>

          <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            <div>
              <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block', fontSize: '1.05rem' }}>
                📌 Auction Name
              </label>
              <input
                type="text"
                value={auctionName}
                onChange={(e) => setAuctionName(e.target.value)}
                placeholder="e.g., Luxury Watch & Art Collection 2026"
                required
                style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '14px', fontSize: '1.05rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block', fontSize: '1.05rem' }}>
                  👥 Maximum Bidders Limit
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxBidders}
                  onChange={(e) => setMaxBidders(e.target.value)}
                  placeholder="8"
                  required
                  style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '14px', fontSize: '1.05rem' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block', fontSize: '1.05rem' }}>
                  💱 Bidding Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    borderRadius: '14px',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif'
                  }}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block', fontSize: '1.05rem' }}>
                🔐 Auction Room Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Share this password with invited bidders"
                required
                style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '14px', fontSize: '1.05rem' }}
              />
            </div>

            {error && <div className="form-error" style={{ width: '100%' }}>{error}</div>}

            <button
              type="submit"
              className="primary"
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '1.1rem',
                borderRadius: '16px',
                fontSize: '1.15rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem'
              }}
            >
              Create & Add Items ➔
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
