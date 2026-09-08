import React, { useState } from 'react';
import { formatCurrency } from '../utils/auctionStorage';

const VISIBLE_LIMIT = 15;

const avatarColors = [
  '#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#9333ea', '#0d9488', '#6366f1',
  '#ec4899', '#f97316', '#14b8a6', '#8b5cf6', '#06b6d4',
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function StatusDot({ status }) {
  const colors = {
    active: '#22c55e',
    dropped: '#ef4444',
    left: '#f59e0b',
  };
  return (
    <span style={{
      display: 'inline-block',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: colors[status] || '#94a3b8',
      border: '2px solid var(--card)',
      position: 'absolute',
      bottom: '2px',
      right: '2px',
      boxShadow: '0 0 0 1px ' + (colors[status] || '#94a3b8'),
    }} />
  );
}

function ParticipantCard({ bidder, idx, currentBidderId, currency }) {
  const isYou = bidder.id === currentBidderId;
  const isInactive = bidder.status === 'dropped' || bidder.status === 'left';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      borderRadius: '12px',
      background: isYou ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      opacity: isInactive ? 0.6 : 1,
      transition: 'all 200ms ease',
      cursor: 'default',
    }}
    onMouseEnter={(e) => { if (!isYou) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'; }}
    onMouseLeave={(e) => { if (!isYou) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: getAvatarColor(bidder.name),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '0.85rem',
          fontWeight: 700,
          letterSpacing: '0.03em',
        }}>
          {getInitials(bidder.name)}
        </div>
        <StatusDot status={bidder.status || 'active'} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginBottom: '0.15rem',
        }}>
          <span style={{
            fontWeight: 600,
            fontSize: '0.9rem',
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {bidder.name}
          </span>
          {isYou && (
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white',
              padding: '0.1rem 0.4rem',
              borderRadius: '6px',
            }}>You</span>
          )}
        </div>
        <div style={{
          fontSize: '0.8rem',
          color: bidder.lastBid ? '#f59e0b' : 'var(--muted)',
          fontWeight: bidder.lastBid ? 600 : 400,
        }}>
          {bidder.lastBid ? formatCurrency(bidder.lastBid, currency) : 'No bid yet'}
        </div>
      </div>

      {/* Status Badge */}
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '0.2rem 0.5rem',
        borderRadius: '6px',
        background: bidder.status === 'active' ? 'rgba(34, 197, 94, 0.15)' :
          (bidder.status === 'dropped' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
        color: bidder.status === 'active' ? '#22c55e' :
          (bidder.status === 'dropped' ? '#ef4444' : '#f59e0b'),
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {(bidder.status || 'active')}
      </span>
    </div>
  );
}

export default function ParticipantsList({ bidders = [], currentBidderId, currency = 'USD' }) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  const sorted = bidders
    .slice()
    .sort((a, b) => (b.lastBid || 0) - (a.lastBid || 0));

  const visible = sorted.slice(0, VISIBLE_LIMIT);
  const hasMore = sorted.length > VISIBLE_LIMIT;

  const filteredAll = search
    ? sorted.filter(b => b.name?.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: '300px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
            👥 Participants ({bidders.length})
          </h3>
        </div>

        {/* Participant Grid */}
        {bidders.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: '0.95rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            border: '1px dashed var(--border)'
          }}>
            <div style={{ fontSize: '2.8rem', marginBottom: '0.75rem', opacity: 0.8 }}>👤</div>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>No participants yet</div>
            <div>Waiting for bidders to join using the room link or QR code.</div>
          </div>
        ) : (
            fontSize: '0.9rem',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div>
            No participants yet.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '0.25rem',
          }}>
            {visible.map((b, idx) => (
              <ParticipantCard
                key={b.id}
                bidder={b}
                idx={idx}
                currentBidderId={currentBidderId}
                currency={currency}
              />
            ))}
          </div>
        )}

        {/* See All Button */}
        {hasMore && (
          <button
            onClick={() => setShowAll(true)}
            style={{
              width: '100%',
              marginTop: '0.75rem',
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px dashed var(--primary)',
              background: 'var(--secondary)',
              color: 'var(--primary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--primary)';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--secondary)';
              e.target.style.color = 'var(--primary)';
            }}
          >
            See all ({bidders.length} participants) →
          </button>
        )}
      </div>

      {/* Full Participants Modal */}
      {showAll && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000,
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '580px',
            width: '95%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(20px)',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)' }}>
                  👥 All Participants
                </h2>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {bidders.length} total · {bidders.filter(b => b.status === 'active').length} active
                </p>
              </div>
              <button
                onClick={() => { setShowAll(false); setSearch(''); }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1px solid var(--border)',
                  background: 'var(--secondary)',
                  color: 'var(--text)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'all 200ms ease',
                }}
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="🔍 Search participants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                marginBottom: '1rem',
                boxSizing: 'border-box',
              }}
            />

            {/* Scrollable List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '0.5rem',
            }}>
              {filteredAll.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem 0' }}>
                  No matching participants found.
                </p>
              ) : (
                filteredAll.map((b, idx) => (
                  <ParticipantCard
                    key={b.id}
                    bidder={b}
                    idx={idx}
                    currentBidderId={currentBidderId}
                    currency={currency}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
