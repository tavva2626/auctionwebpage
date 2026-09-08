import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMultiItemAuction, generateAuctionId, SUPPORTED_CURRENCIES, formatCurrency } from '../utils/auctionStorage';
import { useAuth } from '../context/AuthContext';
import { createMultiItemAuctionRemote } from '../utils/firestoreAuctions';
import { usePageTitle } from '../hooks/usePageTitle';

export default function MultiItemAuctionCreatePage() {
  usePageTitle('Host - Create Multi-Item Auction');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step state: 1 = Auction Settings, 2 = Add Items
  const [step, setStep] = useState(1);

  const [auctionName, setAuctionName] = useState('');
  const [maxBidders, setMaxBidders] = useState('8');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState('');

  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    title: '',
    description: '',
    basePrice: '',
    images: [],
    imagePreviews: [],
  });

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
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
      setError('Auction password is required.');
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + currentItem.imagePreviews.length > 6) {
      setError('Maximum 6 images per item.');
      return;
    }

    const newFiles = files.slice(0, 6 - currentItem.imagePreviews.length);
    const previews = [];

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        previews.push(event.target.result);
        if (previews.length === newFiles.length) {
          setCurrentItem((prev) => ({
            ...prev,
            images: [...prev.images, ...newFiles],
            imagePreviews: [...prev.imagePreviews, ...previews],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setCurrentItem({
      ...currentItem,
      images: currentItem.images.filter((_, i) => i !== index),
      imagePreviews: currentItem.imagePreviews.filter((_, i) => i !== index),
    });
  };

  const addItem = (e) => {
    if (e) e.preventDefault();
    if (!currentItem.title.trim()) {
      setError('Item title is required.');
      return;
    }

    const newItem = {
      ...currentItem,
      title: currentItem.title.trim(),
      description: currentItem.description.trim(),
      basePrice: Number(currentItem.basePrice) || 0,
    };

    setItems([...items, newItem]);
    setCurrentItem({
      title: '',
      description: '',
      basePrice: '',
      images: [],
      imagePreviews: [],
    });
    setError('');
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleLaunchAuction = (event) => {
    event.preventDefault();
    setError('');

    if (!auctionName.trim() || !password.trim()) {
      setError('Auction name and password are required');
      setStep(1);
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one item before launching the auction.');
      return;
    }

    const auctionId = generateAuctionId();
    const multiAuction = {
      id: auctionId,
      name: auctionName.trim(),
      password: password.trim(),
      maxBidders: Number(maxBidders) || 8,
      currency: currency,
      createdBy: user?.username || 'host',
      createdAt: Date.now(),
      items: items.map((item) => ({
        id: generateAuctionId(),
        ...item,
        status: 'waiting',
        bidders: [],
        bids: [],
        winner: null,
        timerEnd: null,
      })),
      currentItemIndex: 0,
      status: 'waiting',
    };

    createMultiItemAuction(multiAuction);
    createMultiItemAuctionRemote(multiAuction).catch((err) => console.warn('Remote sync failed:', err));

    navigate(`/host/multi-auction/${auctionId}`);
  };

  return (
    <main className="page" style={{ width: '100%', maxWidth: '1400px', padding: '1.5rem 2rem' }}>
      {/* Header with Step Indicator */}
      <header className="page-header" style={{ marginBottom: '1.5rem', width: '100%' }}>
        <div>
          <h1 style={{ margin: 0 }}>Create Multi-Item Auction</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.95rem' }}>
            {step === 1 ? 'Step 1 of 2: Configure Auction Settings' : `Step 2 of 2: Add Items to "${auctionName}"`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {step === 2 && (
            <button className="secondary" onClick={() => setStep(1)} style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
              ⚙️ Edit Settings
            </button>
          )}
          <button className="secondary" onClick={() => navigate('/home')} style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
            Back to Home
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '6px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '2rem'
      }}>
        <div style={{
          width: step === 1 ? '50%' : '100%',
          height: '100%',
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          transition: 'width 400ms ease'
        }} />
      </div>

      {/* STEP 1: AUCTION SETTINGS PAGE (FIT TO WHOLE PAGE) */}
      {step === 1 && (
        <div className="card" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>⚙️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text)' }}>Auction Settings</h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>Enter basic details for your multi-item auction.</p>
            </div>
          </div>

          <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block' }}>
                📌 Auction Name
              </label>
              <input
                type="text"
                value={auctionName}
                onChange={(e) => setAuctionName(e.target.value)}
                placeholder="e.g., Spring Luxury Collection 2026"
                required
                style={{ width: '100%', padding: '0.85rem 1.1rem', borderRadius: '12px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block' }}>
                  👥 Maximum Bidders
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxBidders}
                  onChange={(e) => setMaxBidders(e.target.value)}
                  placeholder="8"
                  required
                  style={{ width: '100%', padding: '0.85rem 1.1rem', borderRadius: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block' }}>
                  💱 Preferred Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1.1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontSize: '1rem',
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
              <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block' }}>
                🔐 Auction Room Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Share this password with invited bidders"
                required
                style={{ width: '100%', padding: '0.85rem 1.1rem', borderRadius: '12px' }}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button
              type="submit"
              className="primary"
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: '14px',
                fontSize: '1.1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              Create & Add Items ➔
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: ADD ITEMS PAGE (FIT TO WHOLE PAGE) */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
          {/* Summary Badge Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.5rem',
            borderRadius: '16px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(16px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>📌 {auctionName}</span>
              <span style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 600 }}>
                Currency: {currency}
              </span>
              <span style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontWeight: 600 }}>
                Max Bidders: {maxBidders}
              </span>
              <span style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontWeight: 600 }}>
                Items Added: {items.length}
              </span>
            </div>

            <button
              onClick={handleLaunchAuction}
              disabled={items.length === 0}
              className="primary"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 700,
                opacity: items.length === 0 ? 0.5 : 1,
                cursor: items.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              🚀 Launch Auction ({items.length} {items.length === 1 ? 'Item' : 'Items'})
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}

          {/* Add Item Form Card */}
          <div className="card" style={{ width: '100%', padding: '2rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.3rem', color: 'var(--text)' }}>
              ➕ Add New Item to Auction
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block' }}>
                  📝 Item Title
                </label>
                <input
                  type="text"
                  value={currentItem.title}
                  onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
                  placeholder="e.g., Vintage Rolex Submariner"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block' }}>
                  💵 Starting / Base Price ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentItem.basePrice}
                  onChange={(e) => setCurrentItem({ ...currentItem, basePrice: e.target.value })}
                  placeholder="0"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block' }}>
                📄 Item Description
              </label>
              <textarea
                value={currentItem.description}
                onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                placeholder="Provide details, specifications, and condition..."
                style={{ width: '100%', minHeight: '90px', padding: '0.85rem 1rem', borderRadius: '12px' }}
              />
            </div>

            {/* Image Upload Box */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block' }}>
                🖼️ Upload Item Photos (Up to 6)
              </label>
              <div
                style={{
                  padding: '1.5rem',
                  border: '2px dashed #3b82f6',
                  borderRadius: '14px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(59, 130, 246, 0.04)',
                  transition: 'all 200ms ease',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.04)';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.04)';
                  handleImageUpload({ target: { files: e.dataTransfer.files } });
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id="multi-item-upload"
                />
                <label htmlFor="multi-item-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📸</div>
                  <p style={{ margin: '0.25rem 0', fontWeight: 600, color: 'var(--text)' }}>
                    Drag & drop images or click to select
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                    JPG, PNG up to 6 images ({currentItem.imagePreviews.length}/6 uploaded)
                  </p>
                </label>
              </div>

              {/* Previews */}
              {currentItem.imagePreviews.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '0.75rem',
                  marginTop: '1rem'
                }}>
                  {currentItem.imagePreviews.map((preview, idx) => (
                    <div key={idx} style={{ position: 'relative', height: '90px' }}>
                      <img
                        src={preview}
                        alt={`Preview ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '10px',
                          border: '2px solid var(--border)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          color: 'white',
                          padding: 0,
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={addItem}
              type="button"
              className="secondary"
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1rem'
              }}
            >
              + Add Item to List
            </button>
          </div>

          {/* Added Items Grid Section (Fit Whole Page) */}
          <div style={{ width: '100%' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.3rem', color: 'var(--text)' }}>
              📦 Added Auction Items ({items.length})
            </h2>

            {items.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>No items added yet.</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Use the form above to add items to this auction.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.25rem',
                width: '100%'
              }}>
                {items.map((item, idx) => (
                  <div key={idx} className="card" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    position: 'relative',
                    borderRadius: '16px'
                  }}>
                    <div>
                      {item.imagePreviews && item.imagePreviews[0] ? (
                        <img
                          src={item.imagePreviews[0]}
                          alt={item.title}
                          style={{
                            width: '100%',
                            height: '160px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            marginBottom: '0.75rem',
                            border: '1px solid var(--border)'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '160px',
                          borderRadius: '12px',
                          background: 'var(--secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--muted)',
                          fontSize: '2.5rem',
                          marginBottom: '0.75rem'
                        }}>
                          📦
                        </div>
                      )}

                      <div style={{
                        position: 'absolute',
                        top: '1.75rem',
                        left: '1.75rem',
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(8px)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px'
                      }}>
                        Item #{idx + 1}
                      </div>

                      <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', color: 'var(--text)', fontWeight: 700 }}>
                        {item.title}
                      </h3>
                      {item.description && (
                        <p style={{
                          margin: '0 0 0.75rem',
                          fontSize: '0.85rem',
                          color: 'var(--muted)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '10px',
                        background: 'var(--secondary)',
                        marginBottom: '0.75rem'
                      }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Starting Price:</span>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#10b981' }}>
                          {formatCurrency(item.basePrice, currency)}
                        </span>
                      </div>

                      <button
                        onClick={() => removeItem(idx)}
                        type="button"
                        style={{
                          width: '100%',
                          padding: '0.6rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          transition: 'all 200ms ease'
                        }}
                      >
                        🗑️ Remove Item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
