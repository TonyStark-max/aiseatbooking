import React from 'react';
import type { Event, Booking } from '../lib/api';
import { ArrowLeft, CheckCircle2, Copy } from 'lucide-react';

interface TicketConfirmationProps {
  event: Event;
  booking: Booking;
  seats: string[];
  totalPrice: number;
  onBack: () => void;
}

export const TicketConfirmation: React.FC<TicketConfirmationProps> = ({
  event,
  booking,
  seats,
  totalPrice,
  onBack,
}) => {
  const date = new Date(event.datetime);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  const barcodeText = `*BK-${booking.id}-${seats.join('-')}*`.toUpperCase();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(booking.id.toString());
    alert('Booking code copied to clipboard!');
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '24px' }}>
        <ArrowLeft size={16} />
        <span>Back to Events</span>
      </button>

      <div className="ticket-container">
        <div className="ticket-header">
          <CheckCircle2 size={40} />
          <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 500 }}>Booking Confirmed!</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>Your seats are secured</p>
        </div>

        <div className="ticket-body">
          <div className="event-details">
            <span className="text-caption">EVENT</span>
            <h2 className="event-name" style={{ fontSize: '22px' }}>{event.name}</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
            <div className="event-details">
              <span className="text-caption">DATE & TIME</span>
              <span className="text-body" style={{ fontWeight: 500 }}>{formattedDate}</span>
              <span className="text-caption">{formattedTime}</span>
            </div>
            <div className="event-details">
              <span className="text-caption">VENUE</span>
              <span className="text-body" style={{ fontWeight: 500 }}>{event.venue}</span>
            </div>
          </div>

          <div className="ticket-row" style={{ marginTop: '16px' }}>
            <div className="event-details">
              <span className="text-caption">SEATS</span>
              <span className="text-body text-mono" style={{ fontWeight: 500 }}>{seats.join(', ')}</span>
            </div>
            <div className="event-details" style={{ alignItems: 'flex-end' }}>
              <span className="text-caption">TOTAL PAID</span>
              <span className="text-body text-mono" style={{ fontWeight: 500 }}>${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="ticket-tear-line"></div>

        <div className="ticket-stub">
          <div className="event-details">
            <span className="text-caption">BOOKING ID</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '2px' }}>
              <span className="text-body text-mono" style={{ fontWeight: 600, fontSize: '16px' }}>
                {booking.id}
              </span>
              <button 
                onClick={handleCopyCode} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate)' }}
                title="Copy Booking ID"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div className="ticket-barcode" aria-hidden="true">
            {barcodeText}
          </div>
          <span className="text-caption" style={{ fontSize: '10px' }}>PRESENT BARCODE AT ENTRANCE</span>
        </div>
      </div>
    </div>
  );
};
