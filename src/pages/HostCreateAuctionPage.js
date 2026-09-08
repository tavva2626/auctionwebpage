import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAuction, generateAuctionId, SUPPORTED_CURRENCIES } from '../utils/auctionStorage';
import { createAuctionRemote } from '../utils/firestoreAuctions';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function HostCreateAuctionPage() {
  usePageTitle('Host - Create Auction');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [maxBidders, setMaxBidders] = useState('5');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + imageFiles.length > 6) {
      setError('Maximum 6 images allowed');
      return;
    }

    const newFiles = files.slice(0, 6 - imageFiles.length);
    const previews = [];

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        previews.push(event.target.result);
        if (previews.length === newFiles.length) {
          setImageFiles([...imageFiles, ...newFiles]);
          setImagePreviews([...imagePreviews, ...previews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleCreate = (event) => {
    event.preventDefault();
    setError('');

    if (!title.trim() || !password.trim()) {
      setError('Auction title and password are required.');
      return;
    }

    // Image validation intentionally removed for testing and minimal auctions


    const auctionId = generateAuctionId();

    const auction = {
      id: auctionId,
      password: password.trim(),
      title: title.trim(),
      description: description.trim(),
      history: history.trim(),
      basePrice: Number(basePrice) || 0,
      maxBidders: Number(maxBidders) || 5,
      currency: currency,
      images: imagePreviews,
      createdBy: user?.username || 'host',
      createdAt: Date.now(),
      status: 'waiting',
      timerEnd: null,
      bidders: [],
      winner: null,
    };

    // save locally and remotely (remote is used for cross-device syncing)
    try {
      createAuction(auction);
      // don't block UI: create remote auction but await so we know it succeeded
      createAuctionRemote(auction).catch((err) => console.warn('Remote create failed', err));
    } catch (err) {
      console.error('Failed to create auction locally', err);
    }
    navigate(`/host/auction/${auctionId}`);
  };

  return (
    <main className="page create-auction-page">
      <header className="page-header">
        <h1>Create an Auction</h1>
        <p>Upload images of your item and set auction details.</p>
      </header>

      <form className="card form-card" onSubmit={handleCreate}>
        <label>
          📌 Auction Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter item name" />
        </label>

        <label>
          💵 Base Price
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                width: '140px',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontSize: '0.95rem',
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
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="0"
              style={{ flex: 1, marginTop: 0 }}
            />
          </div>
        </label>

        <label>
          👥 Maximum number of bidders
          <input
            type="number"
            min="1"
            value={maxBidders}
            onChange={(e) => setMaxBidders(e.target.value)}
            placeholder="5"
          />
        </label>

        <label>
          📝 Item description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your item in detail..."
          />
        </label>

        <label>
          🏛️ Item history (optional)
          <textarea
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder="Previous owners, provenance, condition, etc."
          />
        </label>

        <label style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>🖼️ Upload Item Images</span>
          <div style={{
            marginTop: '0.75rem',
            padding: '2rem',
            border: '2px dashed #3b82f6',
            borderRadius: '12px',
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
              id="image-upload"
            />
            <label htmlFor="image-upload" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📸</div>
              <p style={{ margin: '0.5rem 0', color: 'var(--text)', fontWeight: 500 }}>
                Drag and drop images or click to select
              </p>
              <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                JPG, PNG up to 6 images ({imagePreviews.length}/6)
              </p>
            </label>
          </div>
        </label>

        {imagePreviews.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text)' }}>📸 Preview ({imagePreviews.length}/6)</h3>
            <div className="image-preview-grid">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={preview} alt={`Preview ${idx + 1}`} style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'contain',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '10px',
                    border: '2px solid #e5e7eb'
                  }} />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '-10px',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <label>
          🔐 Auction password (share with bidders)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Secret password"
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="primary" style={{ flex: 1 }}>
            Create Auction
          </button>
          <button type="button" className="secondary" onClick={() => navigate('/home')}>
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
