import React, { useState, useEffect } from 'react';
import { ShieldCheck, Timer } from 'lucide-react';

interface BookingSummaryProps {
  selectedSeats: { id: number; label: string }[];
  heldSeatsCount: number;
  holdExpiresAt: number | null;
  ticketPrice: number;
  onHold: () => void;
  onConfirm: (cardholderName: string, cardNumber: string) => void;
  onRelease: () => void;
  onExpire: () => void;
  isProcessing: boolean;
  error: string | null;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedSeats,
  heldSeatsCount,
  holdExpiresAt,
  ticketPrice,
  onHold,
  onConfirm,
  onRelease,
  onExpire,
  isProcessing,
  error,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Countdown timer logic
  useEffect(() => {
    if (!holdExpiresAt) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = holdExpiresAt - Date.now();
      const secondsLeft = Math.max(0, Math.round(difference / 1000));
      setTimeLeft(secondsLeft);

      if (secondsLeft === 0) {
        onExpire();
      }
    };

    calculateTimeLeft(); // run once immediately
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [holdExpiresAt, onExpire]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardholderName.trim()) {
      setValidationError('Cardholder name is required');
      return;
    }
    if (!cardNumber.trim() || cardNumber.replace(/\s/g, '').length < 16) {
      setValidationError('Please enter a valid 16-digit card number');
      return;
    }
    setValidationError(null);
    onConfirm(cardholderName, cardNumber);
  };

  const totalCost = (holdExpiresAt ? heldSeatsCount : selectedSeats.length) * ticketPrice;
  const isUrgent = timeLeft < 60;

  return (
    <div className="sticky-side-panel">
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 500, borderBottom: '0.5px solid var(--color-slate-light)', paddingBottom: '12px' }}>
          Booking Summary
        </h3>
      </div>

      {holdExpiresAt && timeLeft > 0 && (
        <div className={`timer-section ${isUrgent ? 'urgent' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Timer size={18} />
            <span>Seats held! Pay before:</span>
          </div>
          <span className="timer-clock">{formatTime(timeLeft)}</span>
        </div>
      )}

      {selectedSeats.length === 0 && !holdExpiresAt && (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-slate)' }}>
          <p className="text-body">No seats selected</p>
          <p className="text-caption" style={{ marginTop: '6px' }}>Click available seats on the map to begin booking.</p>
        </div>
      )}

      {(selectedSeats.length > 0 || holdExpiresAt) && (
        <div className="selection-details">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="form-label">
              {holdExpiresAt ? 'Held Seats' : 'Selected Seats'}
            </span>
            <div className="selection-list">
              {selectedSeats.map(seat => (
                <span key={seat.id} className="selection-tag">
                  {seat.label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '0.5px solid var(--color-slate-light)', paddingTop: '12px', marginTop: '8px' }}>
            <div className="price-row">
              <span style={{ color: 'var(--color-slate)' }}>Ticket Price</span>
              <span className="text-mono">${ticketPrice.toFixed(2)}</span>
            </div>
            <div className="price-row" style={{ marginTop: '6px' }}>
              <span style={{ color: 'var(--color-slate)' }}>Quantity</span>
              <span className="text-mono">x {holdExpiresAt ? heldSeatsCount : selectedSeats.length}</span>
            </div>
            <div className="price-row" style={{ borderTop: '0.5px solid var(--color-slate-light)', paddingTop: '12px', marginTop: '12px', fontWeight: 500 }}>
              <span>Total Cost</span>
              <span className="price-total">${totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-error" style={{ padding: '10px', backgroundColor: 'rgba(178, 58, 52, 0.05)', borderRadius: '4px', borderLeft: '3px solid var(--color-rose)' }}>
          {error}
        </div>
      )}

      {validationError && (
        <div className="text-error" style={{ padding: '10px', backgroundColor: 'rgba(178, 58, 52, 0.05)', borderRadius: '4px', borderLeft: '3px solid var(--color-rose)' }}>
          {validationError}
        </div>
      )}

      {selectedSeats.length > 0 && !holdExpiresAt && (
        <button
          className="btn btn-primary"
          onClick={onHold}
          disabled={isProcessing}
          style={{ width: '100%' }}
        >
          {isProcessing ? 'Securing Holds...' : 'Hold Selected Seats'}
        </button>
      )}

      {holdExpiresAt && timeLeft > 0 && (
        <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="cardholder-name">Cardholder Name</label>
            <input
              id="cardholder-name"
              type="text"
              className="form-input"
              placeholder="e.g. Somu Shekhar"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              disabled={isProcessing}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="card-number">Card Number</label>
            <input
              id="card-number"
              type="text"
              className="form-input"
              placeholder="1234 5678 1234 5678"
              maxLength={19}
              value={cardNumber}
              onChange={(e) => {
                // simple formatting to add space every 4 digits
                const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                const matches = v.match(/\d{4,16}/g);
                const match = (matches && matches[0]) || '';
                const parts = [];
                for (let i=0, len=match.length; i<len; i+=4) {
                  parts.push(match.substring(i, i+4));
                }
                if (parts.length > 0) {
                  e.target.value = parts.join(' ');
                }
                setCardNumber(e.target.value);
              }}
              disabled={isProcessing}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing}
              style={{ width: '100%' }}
            >
              {isProcessing ? 'Processing Payment...' : 'Confirm Booking & Pay'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onRelease}
              disabled={isProcessing}
              style={{ width: '100%' }}
            >
              Release Seats
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--color-slate)', fontSize: '11px', marginTop: '4px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--color-signal-teal)' }} />
            <span>Secure 256-bit transactional checkout</span>
          </div>
        </form>
      )}

      {holdExpiresAt && timeLeft === 0 && (
        <div style={{ textAlign: 'center' }}>
          <p className="text-error" style={{ fontWeight: 500 }}>Hold has expired</p>
          <button
            className="btn btn-secondary"
            onClick={onRelease}
            style={{ width: '100%', marginTop: '12px' }}
          >
            Select Seats Again
          </button>
        </div>
      )}
    </div>
  );
};
