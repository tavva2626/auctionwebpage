import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { formatCurrency } from '../utils/auctionStorage';
import { listenMultiItemAuctionRemote, updateMultiItemAuctionRemote, getAuctionBidHistory } from '../utils/firestoreAuctions';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import ParticipantsList from '../components/ParticipantsList';
import DurationPickerModal from '../components/DurationPickerModal';
import { getNetworkURL } from '../utils/networkURL';
import { downloadWinnerPDF } from '../utils/pdfExport';
import * as XLSX from 'xlsx';

export default function MultiItemAuctionHostPage() {
  usePageTitle('Host - Multi-Item Auction');
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [auction, setAuction] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showWinnerAlert, setShowWinnerAlert] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const isHost = user?.username === auction?.createdBy;
  const currentItemIdx = auction?.currentItemIndex ?? 0;
  const currentItem = auction?.items?.[currentItemIdx];
  const currency = auction?.currency || 'USD';

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const unsub = listenMultiItemAuctionRemote(auctionId, (data) => {
      setAuction(data);
    });
    return () => unsub && unsub();
  }, [auctionId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  const getWinnerForItem = (item) => {
    if (!item?.bidders?.length) return null;
    let winner = null;
    item.bidders.forEach((b) => {
      const bid = b.lastBid ?? item.basePrice ?? 0;
      if (!winner || bid > (winner.bid ?? 0)) {
        winner = { bidder: b, bid };
      }
    });
    return winner;
  };

  const updateItemStatus = useCallback(async (status) => {
    if (!currentItem || !auction) return;
    const items = (auction.items || []).map((item) => {
      if (item.id !== currentItem.id) return item;
      return { ...item, status };
    });
    await updateMultiItemAuctionRemote(auctionId, { items });
  }, [auction, currentItem, auctionId]);

  useEffect(() => {
    if (!currentItem || currentItem.status !== 'started') return;
    
    if (currentItem.timerEnd && now >= currentItem.timerEnd) {
      // Timer finished
      const winner = getWinnerForItem(currentItem);
      if (winner) {
        setWinnerMessage(
          `🏆 ${winner.bidder.name} won Item ${currentItemIdx + 1}: "${currentItem.title}" at ${formatCurrency(winner.bid, currency)}`
        );
      } else {
        setWinnerMessage(
          `⏰ Time's up for "${currentItem.title}" - No bids were placed`
        );
      }
      setShowWinnerAlert(true);
      
      // Update item status to ended
      updateItemStatus('ended');
    }
  }, [currentItem, now, currentItemIdx, updateItemStatus, currency]);

  const handleStartTimer = () => {
    setShowDurationPicker(true);
  };

  const handleDurationConfirm = async (durationMs) => {
    if (!currentItem || !auction) return;
    const timerEnd = Date.now() + durationMs;
    const items = (auction.items || []).map((item) => {
      if (item.id !== currentItem.id) return item;
      return { ...item, status: 'started', timerEnd };
    });

    await updateMultiItemAuctionRemote(auctionId, { items });
    setShowDurationPicker(false);
  };

  const handleEndTimer = () => {
    if (!currentItem) return;
    updateItemStatus('ended');
  };

  const moveToNextItem = async () => {
    if (currentItemIdx + 1 < auction.items.length) {
      await updateMultiItemAuctionRemote(auctionId, { currentItemIndex: currentItemIdx + 1 });
      setShowWinnerAlert(false);
    }
  };

  const completeAuction = async () => {
    await updateMultiItemAuctionRemote(auctionId, { status: 'ended' });
  };

  const handleExportExcel = async () => {
    if (!auction || isExporting) return;
    setIsExporting(true);
    try {
      const history = await getAuctionBidHistory(auction.id, true);
      
      const wb = XLSX.utils.book_new();

      // Group events by item
      const itemGroups = {};
      history.forEach(event => {
        const title = event.itemTitle || 'Global Events';
        if (!itemGroups[title]) itemGroups[title] = [];
        
        const time = event.time?.seconds 
          ? new Date(event.time.seconds * 1000).toLocaleString() 
          : new Date().toLocaleString();

        itemGroups[title].push({
          "Timestamp": time,
          "Event": (event.type || 'bid').toUpperCase(),
          "Bidder Name": event.bidderName || 'Unknown',
          "Value": event.amount || 0,
          "Bidder ID": event.bidderId || ''
        });
      });

      // Add a sheet for each group
      Object.keys(itemGroups).forEach(title => {
        const safeTitle = title.substring(0, 31).replace(/[\\/?*[\]]/g, '_');
        const ws = XLSX.utils.json_to_sheet(itemGroups[title]);
        XLSX.utils.book_append_sheet(wb, ws, safeTitle);
      });

      // Add all bidders summary
      const allBidders = [];
      (auction.items || []).forEach((item, idx) => {
        (item.bidders || []).forEach((b) => {
          allBidders.push({
            "Item #": idx + 1,
            "Item Title": item.title,
            "Bidder Name": b.name || 'Unknown',
            "Last Bid": b.lastBid || 0,
            "Status": (b.status || 'active').toUpperCase(),
            "Bidder ID": b.id || '',
          });
        });
      });
      if (allBidders.length > 0) {
        const wsBidders = XLSX.utils.json_to_sheet(allBidders);
        XLSX.utils.book_append_sheet(wb, wsBidders, "All Bidders Summary");
      }

      XLSX.writeFile(wb, `multi-auction-${auction.id}-full-report.xlsx`);

    } catch (err) {
      alert("Failed to export: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!auction || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      // For multi-item, we'll create a summary PDF with all winners
      const overallWinner = (() => {
        let best = null;
        (auction.items || []).forEach((item) => {
          const w = getWinnerForItem(item);
          if (w && (!best || w.bid > best.bid)) {
            best = w;
          }
        });
        return best;
      })();

      // Create a summary auction object for the PDF
      const summaryAuction = {
        ...auction,
        title: auction.name || 'Multi-Item Auction',
        basePrice: auction.items?.reduce((sum, it) => sum + (it.basePrice || 0), 0) || 0,
        bidders: (auction.items || []).flatMap(it => it.bidders || [])
          .filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i),
      };
      downloadWinnerPDF(summaryAuction, overallWinner, currency);
    } catch (err) {
      alert("Failed to generate PDF: " + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!auction) {
    return (
      <main className="page">
        <div className="card">
          <h2>Auction not found</h2>
          <Link to="/home" className="primary">Back to home</Link>
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
          <Link to="/home" className="primary">Back to home</Link>
        </div>
      </main>
    );
  }

  if (!currentItem) {
    return (
      <main className="page">
        <div className="card">
          <h2>No items found</h2>
          <Link to="/home" className="primary">Back to home</Link>
        </div>
      </main>
    );
  }

  const timeLeft = currentItem.timerEnd ? Math.max(0, currentItem.timerEnd - now) : 0;
  const shareLink = getNetworkURL(`/bid/multi-join?auctionId=${auction.id}&password=${encodeURIComponent(auction.password)}`);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

  return (
    <main className="page" style={{ paddingBottom: '3rem' }}>
      <header className="page-header">
        <div>
          <h1>📊 {auction.name}</h1>
          <p>Item {currentItemIdx + 1} of {auction.items.length}</p>
        </div>
        <div className="header-actions">
          <Link to="/home" className="secondary">Back to home</Link>
        </div>
      </header>

      {/* Winner Alert */}
      {showWinnerAlert && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          color: 'white',
          padding: '1.5rem 2rem',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          maxWidth: '500px',
          zIndex: 1000,
          animation: 'slideDown 0.4s ease-out',
        }}>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            {winnerMessage}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Main Content */}
        <div>
          {/* Item Display */}
          <div className="card">
            <h2 style={{ marginTop: 0 }}>📦 {currentItem.title}</h2>

            {currentItem.images?.[0] && (
              <div style={{
                width: '100%',
                height: '400px',
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '1rem',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={currentItem.images[0]}
                  alt={currentItem.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>
            )}

            <p style={{ color: 'var(--muted)', margin: '0 0 1rem' }}>
              {currentItem.description}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              padding: '1rem',
              background: 'rgba(59, 130, 246, 0.05)',
              borderRadius: '10px',
              marginBottom: '1rem'
            }}>
              <div>
                <p style={{ margin: '0 0 0.25rem', color: 'var(--muted)', fontSize: '0.9rem' }}>Base Price</p>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#3b82f6' }}>
                  {formatCurrency(currentItem.basePrice, currency)}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem', color: 'var(--muted)', fontSize: '0.9rem' }}>Status</p>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, textTransform: 'capitalize', color: '#8b5cf6' }}>
                  {currentItem.status}
                </p>
              </div>
            </div>
          </div>

          {/* Timer Section */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>⏱️ Timer Management</h3>

            {currentItem.status === 'waiting' && !currentItem.timerEnd && (
              <div>
                <button
                  onClick={handleStartTimer}
                  className="primary"
                  style={{ width: '100%', margin: 0 }}
                >
                  ⏱️ Set Duration & Start Timer
                </button>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.75rem 0 0' }}>
                  ℹ️ Click to set hours, minutes, and seconds for how long bidding will last
                </p>
              </div>
            )}

            {currentItem.status === 'started' && (
              <div>
                <div style={{
                  fontSize: '3.5rem',
                  fontWeight: 700,
                  color: '#3b82f6',
                  textAlign: 'center',
                  padding: '1.5rem',
                  background: 'rgba(59, 130, 246, 0.08)',
                  borderRadius: '12px',
                  marginBottom: '1rem',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em'
                }}>
                  {Math.floor(timeLeft / 1000)}s
                </div>
                <button
                  onClick={handleEndTimer}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  End Timer Now
                </button>
              </div>
            )}

            {currentItem.status === 'ended' && (
              <div style={{
                padding: '1rem',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                marginBottom: '1rem'
              }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>
                  ✅ Auction for this item is complete
                </p>
              </div>
            )}
          </div>

          {/* Share Link */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>🔗 Share Auction Link</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Share this with bidders to join the multi-item auction
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input readOnly value={shareLink} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '0.85rem', color: 'var(--muted)' }} />
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
              <QRCodeCanvas value={shareLink} size={100} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Participants */}
          <div className="card" style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <ParticipantsList
              bidders={currentItem.bidders || []}
              currency={currency}
            />
          </div>

          {/* Item Navigation */}
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>📋 Items</h3>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {auction.items.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    updateMultiItemAuctionRemote(auctionId, { currentItemIndex: idx });
                    setShowWinnerAlert(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    textAlign: 'left',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: idx === currentItemIdx ? 'rgba(59, 130, 246, 0.1)' : '#f9fafb',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    borderLeft: idx === currentItemIdx ? '4px solid #3b82f6' : '4px solid transparent'
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: idx === currentItemIdx ? 600 : 400 }}>
                    {idx + 1}. {item.title}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {item.status === 'ended' && '✅ Complete'}
                    {item.status === 'started' && '🔴 In Progress'}
                    {item.status === 'waiting' && '⏳ Waiting'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation & Controls */}
          <div style={{ marginTop: '1rem' }}>
            {currentItem.status === 'ended' && currentItemIdx < auction.items.length - 1 && (
              <button onClick={moveToNextItem} className="primary" style={{ width: '100%' }}> → Next Item</button>
            )}

            {currentItemIdx === auction.items.length - 1 && currentItem.status === 'ended' && auction.status !== 'ended' && (
              <button onClick={completeAuction} className="primary" style={{ width: '100%', background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>✅ Complete Auction Session</button>
            )}

            {auction.status === 'ended' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    opacity: isExporting ? 0.7 : 1,
                  }}
                >
                  {isExporting ? '⌛ Processing...' : '📊 Download All Bids (Excel)'}
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: isExportingPdf ? 'not-allowed' : 'pointer',
                    opacity: isExportingPdf ? 0.7 : 1,
                  }}
                >
                  {isExportingPdf ? '⌛ Generating...' : '📄 Download Winner Report (PDF)'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <DurationPickerModal
        isOpen={showDurationPicker}
        onConfirm={handleDurationConfirm}
        onCancel={() => setShowDurationPicker(false)}
      />
    </main>
  );
}
