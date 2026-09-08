import React, { useState } from 'react';

const presets = [
  { label: '30s', h: 0, m: 0, s: 30 },
  { label: '1m', h: 0, m: 1, s: 0 },
  { label: '5m', h: 0, m: 5, s: 0 },
  { label: '15m', h: 0, m: 15, s: 0 },
  { label: '30m', h: 0, m: 30, s: 0 },
  { label: '1h', h: 1, m: 0, s: 0 },
];

export default function DurationPickerModal({ isOpen, onConfirm, onCancel }) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);

  if (!isOpen) return null;

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const handleConfirm = () => {
    const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    if (totalMs <= 0) return;
    onConfirm(totalMs);
  };

  const applyPreset = (preset) => {
    setHours(preset.h);
    setMinutes(preset.m);
    setSeconds(preset.s);
  };

  const stepperStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const stepBtnStyle = {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: '2px solid var(--primary)',
    background: 'var(--secondary)',
    color: 'var(--primary)',
    fontSize: '1.4rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 200ms ease',
    padding: 0,
  };

  const valueStyle = {
    fontSize: '3rem',
    fontWeight: 800,
    color: 'var(--text)',
    fontFamily: "'Outfit', monospace",
    width: '80px',
    textAlign: 'center',
    lineHeight: 1,
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  const separatorStyle = {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: 'var(--muted)',
    alignSelf: 'center',
    marginTop: '1.8rem',
  };

  return (
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
        borderRadius: '24px',
        padding: '2.5rem',
        maxWidth: '520px',
        width: '90%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏱️</div>
          <h2 style={{ margin: '0 0 0.25rem', color: 'var(--text)', fontSize: '1.5rem', fontWeight: 700 }}>
            Set Auction Duration
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            Choose how long the bidding session will last
          </p>
        </div>

        {/* Quick Presets */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '2rem',
        }}>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                border: '1px solid var(--primary)',
                background: (hours === p.h && minutes === p.m && seconds === p.s)
                  ? 'var(--primary)' : 'var(--secondary)',
                color: (hours === p.h && minutes === p.m && seconds === p.s)
                  ? 'white' : 'var(--primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Time Steppers */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'rgba(59, 130, 246, 0.04)',
          borderRadius: '16px',
          border: '1px solid rgba(59, 130, 246, 0.1)',
        }}>
          {/* Hours */}
          <div style={stepperStyle}>
            <span style={labelStyle}>Hours</span>
            <button
              style={stepBtnStyle}
              onClick={() => setHours(clamp(hours + 1, 0, 24))}
              onMouseEnter={(e) => { e.target.style.background = 'var(--primary)'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--secondary)'; e.target.style.color = 'var(--primary)'; }}
            >▲</button>
            <div style={valueStyle}>{String(hours).padStart(2, '0')}</div>
            <button
              style={stepBtnStyle}
              onClick={() => setHours(clamp(hours - 1, 0, 24))}
              onMouseEnter={(e) => { e.target.style.background = 'var(--primary)'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--secondary)'; e.target.style.color = 'var(--primary)'; }}
            >▼</button>
          </div>

          <div style={separatorStyle}>:</div>

          {/* Minutes */}
          <div style={stepperStyle}>
            <span style={labelStyle}>Minutes</span>
            <button
              style={stepBtnStyle}
              onClick={() => setMinutes(clamp(minutes + 1, 0, 59))}
              onMouseEnter={(e) => { e.target.style.background = 'var(--primary)'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--secondary)'; e.target.style.color = 'var(--primary)'; }}
            >▲</button>
            <div style={valueStyle}>{String(minutes).padStart(2, '0')}</div>
            <button
              style={stepBtnStyle}
              onClick={() => setMinutes(clamp(minutes - 1, 0, 59))}
              onMouseEnter={(e) => { e.target.style.background = 'var(--primary)'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--secondary)'; e.target.style.color = 'var(--primary)'; }}
            >▼</button>
          </div>

          <div style={separatorStyle}>:</div>

          {/* Seconds */}
          <div style={stepperStyle}>
            <span style={labelStyle}>Seconds</span>
            <button
              style={stepBtnStyle}
              onClick={() => setSeconds(clamp(seconds + 1, 0, 59))}
              onMouseEnter={(e) => { e.target.style.background = 'var(--primary)'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--secondary)'; e.target.style.color = 'var(--primary)'; }}
            >▲</button>
            <div style={valueStyle}>{String(seconds).padStart(2, '0')}</div>
            <button
              style={stepBtnStyle}
              onClick={() => setSeconds(clamp(seconds - 1, 0, 59))}
              onMouseEnter={(e) => { e.target.style.background = 'var(--primary)'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--secondary)'; e.target.style.color = 'var(--primary)'; }}
            >▼</button>
          </div>
        </div>

        {/* Total Duration Display */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
          padding: '0.75rem',
          background: 'rgba(34, 197, 94, 0.08)',
          borderRadius: '10px',
          border: '1px solid rgba(34, 197, 94, 0.2)',
        }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Total Duration: </span>
          <span style={{ fontWeight: 700, color: '#22c55e', fontSize: '1.1rem' }}>
            {hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}m ` : ''}{seconds > 0 ? `${seconds}s` : ''}
            {(hours === 0 && minutes === 0 && seconds === 0) && '0s'}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'var(--secondary)',
              color: 'var(--primary)',
              border: '1px solid var(--primary)',
              borderRadius: '12px',
              padding: '0.85rem 1.5rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 200ms ease',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={hours === 0 && minutes === 0 && seconds === 0}
            style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '0.85rem 2rem',
              fontWeight: 600,
              cursor: (hours === 0 && minutes === 0 && seconds === 0) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              boxShadow: '0 8px 20px rgba(34, 197, 94, 0.3)',
              opacity: (hours === 0 && minutes === 0 && seconds === 0) ? 0.5 : 1,
              transition: 'all 200ms ease',
            }}
          >
            🚀 Start Auction
          </button>
        </div>
      </div>
    </div>
  );
}
