import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  formatCurrency,
  getWinner,
} from '../utils/auctionStorage';
import { 
  listenAuctionRemote, 
  placeBidRemote, 
  dropBidRemote, 
  leaveAuctionRemote 
} from '../utils/firestoreAuctions';
import { usePageTitle } from '../hooks/usePageTitle';
import ModalDialog from '../components/ModalDialog';
import ParticipantsList from '../components/ParticipantsList';

export default function AuctionRoomPage() {
  usePageTitle('Bidder - Auction Room');
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [showDropModal, setShowDropModal] = useState(false);

  const storedBidder = (() => {
    try {
      const fromSession = sessionStorage.getItem('auctionApp.currentBidder');
      if (fromSession) return JSON.parse(fromSession);
      const fromLocal = localStorage.getItem('auctionApp.currentBidder');
      if (fromLocal) return JSON.parse(fromLocal);
      return null;
    } catch {
      return null;
    }
  })();

  const bidder = (() => {
    if (!storedBidder) return null;
    if (storedBidder.auctionId !== auctionId) return null;
    return storedBidder;
  })();

  const currency = auction?.currency || 'USD';

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = listenAuctionRemote(auctionId, (remote) => {
      if (remote) setAuction(remote);
    });
    return () => unsub && unsub();
  }, [auctionId]);

  if (!auction) {
    return (
      <main className="page">
        <div className="card">
          <h2>Loading auction...</h2>
          <p>Please wait while we connect to the room.</p>
        </div>
      </main>
    );
  }

  // EXPIRED STATE - Enhanced completed view
  if (auction.status === 'ended') {
    const finalWinner = getWinner(auction);
    return (
      <main className="page">
        <div className="auction-layout-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2.5rem' }}>
            {/* Completion Banner */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.03))',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginBottom: '2rem',
              textAlign: 'center',
            }}>
              <h2 style={{ margin: '0 0 0.5rem', color: '#ef4444', fontSize: '1.8rem' }}>🔴 Auction Expired</h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '1rem', lineHeight: '1.5' }}>
                This auction session has been completed by the host. Participation is no longer possible.
              </p>
            </div>

            {/* Item Photo */}
            {auction.images?.[0] && (
              <div style={{
                width: '100%',
                height: '350px',
                backgroundColor: '#f3f4f6',
                borderRadius: '16px',
                overflow: 'hidden',
                margin: '0 0 2rem',
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

            {/* Item Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}>
              <div style={{ padding: '1rem', background: 'var(--secondary)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Item Name</p>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: 'var(--text)', fontSize: '1.1rem' }}>{auction.title}</p>
              </div>
              <div style={{ padding: '1rem', background: 'var(--secondary)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Base Price</p>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: '#3b82f6', fontSize: '1.1rem' }}>{formatCurrency(auction.basePrice, currency)}</p>
              </div>
              <div style={{ padding: '1rem', background: 'var(--secondary)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Bidders</p>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: 'var(--text)', fontSize: '1.1rem' }}>{auction.bidders?.length || 0}</p>
              </div>
              <div style={{ padding: '1rem', background: 'var(--secondary)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Host</p>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: 'var(--text)', fontSize: '1.1rem' }}>{auction.createdBy}</p>
              </div>
            </div>

            {/* Description */}
            {auction.description && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>📝 Description</h3>
                <p style={{ margin: 0, lineHeight: '1.6', color: 'var(--text)' }}>{auction.description}</p>
              </div>
            )}

            {/* History/Provenance */}
            {auction.history && (
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(59, 130, 246, 0.03)', 
                borderRadius: '10px', 
                borderLeft: '4px solid #3b82f6',
                marginBottom: '2rem'
              }}>
                <h4 style={{ margin: '0 0 0.5rem', color: '#3b82f6' }}>📜 Item Provenance & History</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', fontStyle: 'italic' }}>{auction.history}</p>
              </div>
            )}

            {/* Winner Card */}
            <div style={{
              padding: '2rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              textAlign: 'center',
              marginBottom: '2rem',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
              <h3 style={{ margin: '0 0 0.75rem', color: '#22c55e', fontSize: '1.3rem' }}>Winner</h3>
              {finalWinner ? (
                <>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
                    {finalWinner.bidder.name}
                  </p>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '1.2rem', fontWeight: 600, color: '#22c55e' }}>
                    Winning Bid: {formatCurrency(finalWinner.bid, currency)}
                  </p>
                </>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>No bids were placed.</p>
              )}
            </div>
            
            <button className="primary" style={{ width: '100%' }} onClick={() => navigate('/home')}>
              Back to Dashboard
            </button>
          </div>

          {/* Participants Sidebar */}
          <div className="card bidder-list">
            <ParticipantsList
              bidders={auction.bidders || []}
              currentBidderId={bidder?.bidderId}
              currency={currency}
            />
          </div>
        </div>
      </main>
    );
  }

  if (!bidder) {
    return (
      <main className="page">
        <div className="card">
          <h2>Not joined yet</h2>
          <p>It looks like you haven't joined this auction as a bidder yet.</p>
          <button className="primary" onClick={() => navigate('/bid/join')}>
            Join auction
          </button>
        </div>
      </main>
    );
  }

  const timeLeft = auction.timerEnd ? Math.max(0, auction.timerEnd - now) : 0;
  const canBid = auction.status === 'started' && timeLeft > 0;

  const highestBid = (() => {
    if (!auction.bidders || auction.bidders.length === 0) return auction.basePrice || 0;
    const top = auction.bidders
      .map((b) => b.lastBid || 0)
      .reduce((max, current) => (current > max ? current : max), 0);
    return Math.max(top, auction.basePrice || 0);
  })();

  const winner = getWinner(auction);

  // Status checks
  const currentBidderInfo = auction.bidders?.find((b) => b.id === bidder.bidderId);
  const isDropped = currentBidderInfo?.status === 'dropped' || currentBidderInfo?.isDropped;
  const hasLeft = currentBidderInfo?.status === 'left';

  const handleBid = async (event) => {
    event.preventDefault();
    setError('');

    if (isDropped || hasLeft) {
      setError('You are no longer active in this auction.');
      return;
    }

    const amount = Number(bidAmount);
    if (!amount || amount <= (auction.basePrice || 0)) {
      setError('Bid must be greater than the base price.');
      return;
    }
    if (amount <= highestBid) {
      setError('Your bid must be higher than the current highest bid.');
      return;
    }

    try {
      await placeBidRemote(auction.id, bidder.bidderId, amount);
      setBidAmount('');
    } catch (err) {
      setError(err?.message || 'Error placing bid');
    }
  };

  const handleDropBid = () => {
    setShowDropModal(true);
  };

  const handleDropConfirm = async (confirmed) => {
    setShowDropModal(false);
    if (confirmed) {
      await dropBidRemote(auction.id, bidder.bidderId);
    }
  };

  const handleLeave = async () => {
    await leaveAuctionRemote(auction.id, bidder.bidderId);
    sessionStorage.removeItem('auctionApp.currentBidder');
    localStorage.removeItem('auctionApp.currentBidder');
    navigate('/home');
  };

  return (
    <main className="page auction-room">
      <header className="page-header">
        <div>
          <h1>{auction.title}</h1>
          <p>
            Joining as <strong>{bidder.name}</strong>
          </p>
        </div>
        <button className="secondary" onClick={handleLeave}>
          Leave auction
        </button>
      </header>

      <div className="auction-layout-container">
        <section className="card auction-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>📦 Lot 1</h2>
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 700, 
            padding: '0.3rem 0.8rem',
            borderRadius: '20px',
            background: auction.status === 'started' ? '#3b82f6' : (auction.status === 'ended' ? '#22c55e' : '#e5e7eb'),
            color: auction.status === 'waiting' ? '#64748b' : '#fff'
          }}>
            {auction.status === 'started' ? '🔴 LIVE NOW' : (auction.status === 'ended' ? '✅ COMPLETED' : '⏳ UPCOMING')}
          </span>
        </div>

        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          {auction.title}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Base Price</p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem', color: 'var(--text)' }}>{formatCurrency(auction.basePrice, currency)}</p>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Current Bid</p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem', color: '#f59e0b' }}>{formatCurrency(highestBid, currency)}</p>
          </div>
        </div>

        {auction.images?.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              width: '100%',
              height: '400px',
              backgroundColor: '#f3f4f6',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '1rem',
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
            {auction.images.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.75rem' }}>
                {auction.images.map((p, i) => (
                  <div key={i} style={{ 
                    height: '80px', 
                    borderRadius: '8px', 
                    overflow: 'hidden', 
                    border: i === 0 ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    cursor: 'pointer',
                    background: '#fff'
                  }}>
                    <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="auction-details">
          <h3>Description</h3>
          <p style={{ lineHeight: '1.6', color: 'var(--text)', marginBottom: '1.5rem' }}>{auction.description}</p>
          
          {auction.history && (
            <div style={{ 
              padding: '1rem', 
              background: 'rgba(59, 130, 246, 0.03)', 
              borderRadius: '10px', 
              borderLeft: '4px solid #3b82f6',
              marginTop: '1.5rem'
            }}>
              <h4 style={{ margin: '0 0 0.5rem', color: '#3b82f6' }}>📜 Item Provenance & History</h4>
              <p style={{ margin: 0, fontSize: '0.95rem', fontStyle: 'italic' }}>{auction.history}</p>
            </div>
          )}
        </div>

        {!canBid && auction.status === 'waiting' && (
          <p className="hint">Waiting for the host to start the timer...</p>
        )}

        {auction.status === 'started' && (
          <div style={{ marginBottom: '1.5rem', padding: '2rem', textAlign: 'center', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px' }}>
            <p style={{ margin: '0 0 0.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>Time Remaining</p>
            <div style={{
              fontSize: '4rem',
              fontWeight: 700,
              color: '#3b82f6',
              fontFamily: 'monospace',
              letterSpacing: '0.1em'
            }}>
              {Math.floor(timeLeft / 1000)}s
            </div>
          </div>
        )}

        {(isDropped || hasLeft) && (
          <div className="card" style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#dc2626' }}>
              🚫 You are no longer active in this auction ({isDropped ? 'Dropped' : 'Left'}).
            </p>
          </div>
        )}

        {canBid && !isDropped && !hasLeft && (
          <form className="bid-form" onSubmit={handleBid}>
            <label>
              Your bid ({currency})
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Minimum: ${formatCurrency(Math.floor(highestBid) + 1, currency)}`}
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button type="submit" className="primary">
                Place bid
              </button>
              <button
                type="button"
                onClick={handleDropBid}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                🚫 Drop Out
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="card bid-list">
        <ParticipantsList
          bidders={auction.bidders || []}
          currentBidderId={bidder.bidderId}
          currency={currency}
        />
      </section>
      </div>

      <ModalDialog
        isOpen={showDropModal}
        title="Drop Out"
        message="Are you sure you want to drop out of this auction? You won't be able to bid anymore."
        type="confirm"
        onConfirm={handleDropConfirm}
        onCancel={() => setShowDropModal(false)}
        confirmText="Drop Out"
        cancelText="Cancel"
      />
    </main>
  );
}
