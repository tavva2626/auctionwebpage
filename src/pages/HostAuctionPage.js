import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { formatCurrency, getWinner } from '../utils/auctionStorage';
import { listenAuctionRemote, updateAuctionRemote, getAuctionBidHistory } from '../utils/firestoreAuctions';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import ModalDialog from '../components/ModalDialog';
import DurationPickerModal from '../components/DurationPickerModal';
import ParticipantsList from '../components/ParticipantsList';
import { getNetworkURL } from '../utils/networkURL';
import { downloadWinnerPDF } from '../utils/pdfExport';
import * as XLSX from 'xlsx';

function formatTimeRemaining(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export default function HostAuctionPage() {
  usePageTitle('Host - Auction Dashboard');
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [auction, setAuction] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const isHost = user?.username === auction?.createdBy;
  const currency = auction?.currency || 'USD';

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const unsub = listenAuctionRemote(auctionId, (data) => {
      setAuction(data);
    });
    return () => unsub && unsub();
  }, [auctionId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!auction) return;
    if (auction.status === 'started' && auction.timerEnd && now >= auction.timerEnd) {
      updateAuctionRemote(auction.id, { status: 'ended' });
    }
  }, [auction, now]);

  if (!auction) {
    return (
      <main className="page">
        <div className="card">
          <h2>Auction not found</h2>
          <p>The auction ID may be invalid or it has been removed.</p>
          <Link to="/home" className="primary">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  if (!isHost) {
    return (
      <main className="page">
        <div className="card">
          <h2>Access denied</h2>
          <p>Only the auction host can access this page.</p>
          <Link to="/home" className="primary">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const shareLink = getNetworkURL(`/bid/join?auctionId=${auction.id}&password=${encodeURIComponent(
    auction.password
  )}`);

  const timeRemaining = auction.timerEnd ? Math.max(0, auction.timerEnd - now) : 0;

  const winner = getWinner(auction);

  const handleStart = () => {
    setShowDurationPicker(true);
  };

  const handleDurationConfirm = async (durationMs) => {
    const timerEnd = Date.now() + durationMs;
    await updateAuctionRemote(auction.id, {
      status: 'started',
      timerEnd,
    });
    setShowDurationPicker(false);
  };

  const handleEnd = async () => {
    await updateAuctionRemote(auction.id, { status: 'ended' });
  };

  const handleClear = () => {
    setShowClearModal(true);
  };

  const handleClearConfirm = async (confirmed) => {
    setShowClearModal(false);
    if (confirmed) {
      await updateAuctionRemote(auction.id, { bidders: [] });
    }
  };

  const handleExportExcel = async () => {
    if (!auction || isExporting) return;
    setIsExporting(true);
    try {
      const history = await getAuctionBidHistory(auction.id);
      
      const rows = history.map(event => {
        const time = event.time?.seconds 
          ? new Date(event.time.seconds * 1000).toLocaleString() 
          : new Date().toLocaleString();
        
        return {
          "Timestamp": time,
          "Event Type": (event.type || 'bid').toUpperCase(),
          "Bidder Name": event.bidderName || 'Unknown',
          "Amount": event.amount || 0,
          "Bidder ID": event.bidderId || ''
        };
      });

      // Add bidders summary sheet
      const bidderRows = (auction.bidders || []).map((b, idx) => ({
        "#": idx + 1,
        "Bidder Name": b.name || 'Unknown',
        "Last Bid": b.lastBid || 0,
        "Status": (b.status || 'active').toUpperCase(),
        "Bidder ID": b.id || '',
      }));

      const wb = XLSX.utils.book_new();
      
      const ws1 = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws1, "Bid History");
      
      const ws2 = XLSX.utils.json_to_sheet(bidderRows);
      XLSX.utils.book_append_sheet(wb, ws2, "All Bidders");

      XLSX.writeFile(wb, `auction-${auction.id}-full-report.xlsx`);

    } catch (err) {
      alert("Failed to export data: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      downloadWinnerPDF(auction, winner, currency);
    } catch (err) {
      alert("Failed to generate PDF: " + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyLink = () => {
    const shareLink = getNetworkURL(`/bid/join?auctionId=${auction.id}&password=${encodeURIComponent(auction.password)}`);
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

  // Completed auction view
  if (auction.status === 'ended') {
    return (
      <main className="page auction-page">
        <header className="page-header">
          <div>
            <h1>Host view: {auction.title}</h1>
            <p>Created by {auction.createdBy}</p>
          </div>
          <div className="header-actions">
            <Link to="/home" className="secondary">Back to home</Link>
            <button className="secondary" onClick={() => navigate('/host/create')}>Create new auction</button>
          </div>
        </header>

        <div className="auction-layout-container">
          <section className="card auction-summary">
            {/* Completion Banner */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.03))',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginBottom: '2rem',
              textAlign: 'center',
            }}>
              <h2 style={{ margin: '0 0 0.5rem', color: '#ef4444', fontSize: '1.5rem' }}>🔴 Auction Completed</h2>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                This auction session has been completed. All results are final.
              </p>
            </div>

            {/* Item Display */}
            {auction.images?.[0] && (
              <div style={{
                width: '100%',
                height: '300px',
                backgroundColor: '#f3f4f6',
                borderRadius: '16px',
                overflow: 'hidden',
                margin: '0 0 1.5rem',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={auction.images[0]}
                  alt={auction.title}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            )}

            {/* Auction Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ padding: '1rem', background: 'var(--secondary)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Item</p>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: 'var(--text)' }}>{auction.title}</p>
              </div>
              <div style={{ padding: '1rem', background: 'var(--secondary)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Base Price</p>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(auction.basePrice, currency)}</p>
              </div>
              <div style={{ padding: '1rem', background: 'var(--secondary)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status</p>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Ended</p>
              </div>
              <div style={{ padding: '1rem', background: 'var(--secondary)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Bidders</p>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: 'var(--text)' }}>{auction.bidders?.length || 0}</p>
              </div>
            </div>

            <h3>Description</h3>
            <p style={{ lineHeight: '1.6', color: 'var(--text)' }}>{auction.description || 'No description provided.'}</p>

            {auction.history && (
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(59, 130, 246, 0.03)', 
                borderRadius: '10px', 
                borderLeft: '4px solid #3b82f6',
                margin: '1rem 0'
              }}>
                <h4 style={{ margin: '0 0 0.5rem', color: '#3b82f6' }}>📜 Item Provenance & History</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', fontStyle: 'italic' }}>{auction.history}</p>
              </div>
            )}

            {/* Winner Card */}
            <div style={{
              margin: '2rem 0',
              padding: '2rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#22c55e', fontSize: '1.3rem' }}>Winner</h3>
              {winner ? (
                <>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
                    {winner.bidder.name}
                  </p>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '1.2rem', fontWeight: 600, color: '#22c55e' }}>
                    Winning Bid: {formatCurrency(winner.bid, currency)}
                  </p>
                </>
              ) : (
                <p style={{ color: 'var(--muted)' }}>No bids were placed.</p>
              )}
            </div>

            {/* Download Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  opacity: isExporting ? 0.7 : 1,
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                }}
              >
                {isExporting ? '⌛ Processing...' : '📊 Download All Bids (Excel)'}
              </button>
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: isExportingPdf ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  opacity: isExportingPdf ? 0.7 : 1,
                  boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)',
                }}
              >
                {isExportingPdf ? '⌛ Generating...' : '📄 Download Winner Report (PDF)'}
              </button>
            </div>
          </section>

          <section className="card bidder-list">
            <ParticipantsList bidders={auction.bidders || []} currency={currency} />
          </section>
        </div>
      </main>
    );
  }

  // Active/waiting auction view
  return (
    <main className="page auction-page">
      <header className="page-header">
        <div>
          <h1>Host view: {auction.title}</h1>
          <p>Created by {auction.createdBy}</p>
        </div>
        <div className="header-actions">
          <Link to="/home" className="secondary">
            Back to home
          </Link>
          <button className="secondary" onClick={() => navigate('/host/create')}>
            Create new auction
          </button>
        </div>
      </header>

      <div className="auction-layout-container">
        <section className="card auction-summary">
        <h2>Auction details</h2>
        <div className="auction-meta">
          <div>
            <strong>Base price:</strong> {formatCurrency(auction.basePrice, currency)}
          </div>
          <div>
            <strong>Max bidders:</strong> {auction.maxBidders}
          </div>
          <div>
            <strong>Status:</strong> {auction.status}
          </div>
          {auction.status === 'started' && (
            <div>
              <strong>Time left:</strong> {formatTimeRemaining(timeRemaining)}
            </div>
          )}
        </div>

        {auction.images?.[0] && (
          <div style={{
            width: '100%',
            height: '300px',
            backgroundColor: '#f3f4f6',
            borderRadius: '12px',
            overflow: 'hidden',
            margin: '1.5rem 0',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src={auction.images[0]}
              alt={auction.title}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
        )}

        <h3>Description</h3>
        <p>{auction.description || 'No description provided.'}</p>

        <div className="share-section">
          <h3>Share this auction</h3>
          <p>Share this link or show the QR code to bidders.</p>
          <div className="share-box">
            <input readOnly value={shareLink} />
            <button
              onClick={handleCopyLink}
              title="Copy link to clipboard"
              style={{
                background: copyFeedback ? '#10b981' : 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 200ms ease',
                fontSize: '0.9rem',
              }}
            >
              {copyFeedback ? '✓ Copied!' : '📋 Copy'}
            </button>
            <QRCodeCanvas value={shareLink} size={148} />
          </div>
        </div>

        <div className="auction-actions">
          {auction.status === 'waiting' && !auction.timerEnd && (
            <button className="primary" onClick={handleStart}>
              Start auction timer
            </button>
          )}
          {auction.status === 'started' && (
            <button className="primary" onClick={handleEnd}>
              End auction now
            </button>
          )}
          <button className="secondary" onClick={handleClear}>
            Clear bidders
          </button>
        </div>
      </section>

      <section className="card bidder-list">
        <ParticipantsList bidders={auction.bidders || []} currency={currency} />

        {auction.status === 'ended' && (
          <div className="winner-box">
            <h3>Winner</h3>
            {winner ? (
              <p>
                <strong>{winner.bidder.name}</strong> with a bid of{' '}
                {formatCurrency(winner.bid, currency)}
              </p>
            ) : (
              <p>No bids were placed.</p>
            )}
          </div>
        )}
      </section>
      </div>

      <DurationPickerModal
        isOpen={showDurationPicker}
        onConfirm={handleDurationConfirm}
        onCancel={() => setShowDurationPicker(false)}
      />

      <ModalDialog
        isOpen={showClearModal}
        title="Clear Auction"
        message="Are you sure you want to clear all bidders and bids? This action cannot be undone."
        type="confirm"
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearModal(false)}
        confirmText="Clear"
        cancelText="Cancel"
      />
    </main>
  );
}
