import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMultiItemAuction, generateAuctionId, formatCurrency } from '../utils/auctionStorage';
import { useAuth } from '../context/AuthContext';
import { createMultiItemAuctionRemote } from '../utils/firestoreAuctions';
import { usePageTitle } from '../hooks/usePageTitle';

export default function MultiItemAddItemsPage() {
  usePageTitle('Host - Add Items');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [settings, setSettings] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

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
      return;
    }

    const saved = sessionStorage.getItem('pendingMultiAuctionSettings');
    if (!saved) {
      navigate('/host/multi-create', { replace: true });
      return;
    }

    try {
      setSettings(JSON.parse(saved));
    } catch (e) {
      navigate('/host/multi-create', { replace: true });
    }
  }, [user, navigate]);

  if (!user || !settings) return null;

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + currentItem.imagePreviews.length > 6) {
      setError('Maximum 6 images allowed per item');
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
    setError('');

    if (!currentItem.title.trim()) {
      setError('Item title is required');
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
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleLaunchAuction = (event) => {
    event.preventDefault();
    setError('');

    if (items.length === 0) {
      setError('Please add at least one item before launching the auction');
      return;
    }

    const auctionId = generateAuctionId();
    const multiAuction = {
      id: auctionId,
      name: settings.name,
      password: settings.password,
      maxBidders: Number(settings.maxBidders) || 8,
      currency: settings.currency || 'USD',
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

    sessionStorage.removeItem('pendingMultiAuctionSettings');
    navigate(`/host/multi-auction/${auctionId}`);
  };

  return (
    <main className="page" style={{ width: '100%', maxWidth: '100%', padding: '1.25rem 2rem', minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* Page Header */}
      <header className="page-header" style={{ width: '100%', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem' }}>Add Auction Items</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '1rem' }}>
            Adding items for multi-item auction: <strong>{settings.name}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="secondary"
            onClick={() => navigate('/host/multi-create')}
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
          >
            ← Back to Auction Settings
          </button>
          <button
            className="secondary"
            onClick={() => navigate('/home')}
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
          >
            Cancel & Exit
          </button>
        </div>
      </header>

      {/* Summary Badge Bar (Fit to Whole Page) */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.5rem',
        borderRadius: '16px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(16px)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>📌 {settings.name}</span>
          <span style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 600 }}>
            Currency: {settings.currency || 'USD'}
          </span>
          <span style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontWeight: 600 }}>
            Max Bidders: {settings.maxBidders}
          </span>
          <span style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontWeight: 600 }}>
            Total Items: {items.length}
          </span>
        </div>

        <button
          onClick={handleLaunchAuction}
          disabled={items.length === 0}
          className="primary"
          style={{
            padding: '0.75rem 1.75rem',
            borderRadius: '12px',
            fontSize: '1.05rem',
            fontWeight: 700,
            opacity: items.length === 0 ? 0.5 : 1,
            cursor: items.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          🚀 Launch Auction ({items.length} {items.length === 1 ? 'Item' : 'Items'})
        </button>
      </div>

      {error && <div className="form-error" style={{ width: '100%', marginBottom: '1.5rem' }}>{error}</div>}

      {/* Main Form & Added Items Container (Fit to Whole Page) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', flex: 1 }}>
        {/* Add Item Form Card */}
        <div className="card" style={{ width: '100%', padding: '2rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.3rem', color: 'var(--text)' }}>
            ➕ Enter Details for New Item
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
                placeholder="e.g., Antique Gold Watch / Rolex Submariner"
                style={{ width: '100%', padding: '0.85rem 1.1rem', borderRadius: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block' }}>
                💵 Starting / Base Price ({settings.currency || 'USD'})
              </label>
              <input
                type="number"
                min="0"
                value={currentItem.basePrice}
                onChange={(e) => setCurrentItem({ ...currentItem, basePrice: e.target.value })}
                placeholder="0"
                style={{ width: '100%', padding: '0.85rem 1.1rem', borderRadius: '12px' }}
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
              placeholder="Provide item details, condition, specifications..."
              style={{ width: '100%', minHeight: '90px', padding: '0.85rem 1.1rem', borderRadius: '12px' }}
            />
          </div>

          {/* Upload Box */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'block' }}>
              🖼️ Upload Item Photos (Up to 6 images)
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
                id="add-item-photo-upload"
              />
              <label htmlFor="add-item-photo-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📸</div>
                <p style={{ margin: '0.25rem 0', fontWeight: 600, color: 'var(--text)' }}>
                  Drag & drop images or click to browse
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  JPG, PNG formats supported ({currentItem.imagePreviews.length}/6 uploaded)
                </p>
              </label>
            </div>

            {/* Image Previews */}
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
              padding: '0.9rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1rem'
            }}
          >
            + Add Item to Auction List
          </button>
        </div>

        {/* Added Items Section (Fit to Whole Page) */}
        <div style={{ width: '100%' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.3rem', color: 'var(--text)' }}>
            📦 Added Auction Items ({items.length})
          </h2>

          {items.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', width: '100%' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>No items added yet.</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Use the form above to add items to this auction session.</p>
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
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Base Price:</span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#10b981' }}>
                        {formatCurrency(item.basePrice, settings.currency || 'USD')}
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
    </main>
  );
}
