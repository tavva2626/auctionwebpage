import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMultiItemAuction, generateAuctionId, SUPPORTED_CURRENCIES } from '../utils/auctionStorage';
import { useAuth } from '../context/AuthContext';
import { createMultiItemAuctionRemote } from '../utils/firestoreAuctions';
import { usePageTitle } from '../hooks/usePageTitle';

export default function MultiItemAuctionCreatePage() {
  usePageTitle('Host - Create Multi-Item Auction');
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + currentItem.imagePreviews.length > 6) {
      setError('Maximum 6 images per item');
      return;
    }

    const newFiles = files.slice(0, 6 - currentItem.imagePreviews.length);
    const previews = [];

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        previews.push(event.target.result);
        if (previews.length === newFiles.length) {
          setCurrentItem({
            ...currentItem,
            images: [...currentItem.images, ...newFiles],
            imagePreviews: [...currentItem.imagePreviews, ...previews],
          });
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

  const addItem = () => {
    if (!currentItem.title.trim()) {
      setError('Item title is required');
      return;
    }
    // Removed hard block for empty images to permit blank/test items

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

  const handleCreate = (event) => {
    event.preventDefault();
    setError('');

    if (!auctionName.trim() || !password.trim()) {
      setError('Auction name and password are required');
      return;
    }

    if (items.length === 0) {
      setError('Add at least one item to the auction');
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
    // don't block UI: push to Firestore in the background
    createMultiItemAuctionRemote(multiAuction).catch(err => console.warn('Remote sync failed:', err));

    navigate(`/host/multi-auction/${auctionId}`);
  };

  return (
    <main className="page">
      <header className="page-header">
        <h1>Create Multi-Item Auction</h1>
        <button className="secondary" onClick={() => navigate('/home')}>
          Back to Home
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Auction Settings */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>⚙️ Auction Settings</h2>

          <label>
            📌 Auction Name
            <input
              value={auctionName}
              onChange={(e) => setAuctionName(e.target.value)}
              placeholder="e.g., Spring Collection Auction"
            />
          </label>

          <label>
            👥 Maximum Bidders
            <input
              type="number"
              min="1"
              value={maxBidders}
              onChange={(e) => setMaxBidders(e.target.value)}
              placeholder="8"
            />
          </label>

          <label>
            🔐 Auction Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Share with bidders"
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button
            onClick={handleCreate}
            className="primary"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            Create Auction ({items.length} items)
          </button>
        </div>

        {/* Add Items */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>➕ Add Items</h2>

          <label>
            📝 Item Title
            <input
              value={currentItem.title}
              onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
              placeholder="Item name"
            />
          </label>

          <label>
            💵 Base Price
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{
                  width: '130px',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--input-border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif',
                }}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={currentItem.basePrice}
                onChange={(e) => setCurrentItem({ ...currentItem, basePrice: e.target.value })}
                placeholder="0"
                style={{ flex: 1, marginTop: 0 }}
              />
            </div>
          </label>

          <label>
            📝 Description
            <textarea
              value={currentItem.description}
              onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
              placeholder="Item details..."
              style={{ minHeight: '80px' }}
            />
          </label>

          <label style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>🖼️ Upload Images</span>
            <div style={{
              marginTop: '0.5rem',
              padding: '1.5rem',
              border: '2px dashed #3b82f6',
              borderRadius: '10px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(59, 130, 246, 0.04)',
              transition: 'all 200ms ease'
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.borderColor = '#60a5fa';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.04)';
              e.currentTarget.style.borderColor = '#3b82f6';
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
                id="item-image-upload"
              />
              <label htmlFor="item-image-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📸</div>
                <p style={{ margin: '0.5rem 0', fontWeight: 500 }}>
                  Drag and drop images or click to select
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  JPG, PNG up to 6 images ({currentItem.imagePreviews.length}/6)
                </p>
              </label>
            </div>
          </label>

          {currentItem.imagePreviews.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div className="image-preview-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {currentItem.imagePreviews.map((preview, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img
                      src={preview}
                      alt={`Item Preview ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100px',
                        objectFit: 'contain',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={addItem}
            className="secondary"
            style={{ width: '100%' }}
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div style={{ marginTop: '2rem', maxWidth: '1200px', margin: '2rem auto 0' }}>
          <h2>📦 Items Added ({items.length})</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {items.map((item, idx) => (
              <div key={idx} className="card" style={{ position: 'relative' }}>
                {item.imagePreviews[0] && (
                  <img
                    src={item.imagePreviews[0]}
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'contain',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px',
                      marginBottom: '0.75rem'
                    }}
                  />
                )}
                <h3 style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: 'var(--text)' }}>
                  {item.title}
                </h3>
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Base: ${item.basePrice}
                </p>
                <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {item.imagePreviews.length} image(s)
                </p>
                <button
                  onClick={() => removeItem(idx)}
                  style={{
                    marginTop: '0.75rem',
                    width: '100%',
                    padding: '0.5rem',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
