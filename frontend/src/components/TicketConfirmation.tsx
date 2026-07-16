import React from 'react';
import type { Event, Booking } from '../lib/api';
import { ArrowLeft, CheckCircle2, Copy, Calendar, MapPin, CreditCard, User, DoorOpen, BadgeCheck } from 'lucide-react';

interface TicketConfirmationProps {
  event: Event;
  booking: Booking;
  seats: string[];
  totalPrice: number;
  cardholderName?: string;
  cardNumberMasked?: string;
  onBack: () => void;
}

export const TicketConfirmation: React.FC<TicketConfirmationProps> = ({
  event,
  booking,
  seats,
  totalPrice,
  cardholderName,
  cardNumberMasked,
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

  // Determine Gate based on the first seat row
  const firstSeat = seats[0] || 'A1';
  const rowChar = firstSeat.charAt(0).toUpperCase();
  const gate = ['A', 'B', 'C'].includes(rowChar) ? 'Gate A (South Entrance)' : 'Gate B (North Entrance)';

  return (
    <div style={{ padding: '20px 0', maxWidth: '480px', margin: '0 auto' }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={16} />
        <span>Back to Events</span>
      </button>

      <div className="ticket-container" style={{ boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)', overflow: 'hidden' }}>
        <div className="ticket-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '28px 24px' }}>
          <CheckCircle2 size={44} style={{ color: 'var(--color-signal-teal)' }} />
          <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 600, margin: 0 }}>Booking Confirmed!</h1>
          <p style={{ color: 'var(--color-slate)', fontSize: '13px', margin: 0 }}>Your seats are secured and payment was processed</p>
          
          <div style={{ 
            marginTop: '8px', 
            padding: '4px 10px', 
            backgroundColor: 'rgba(16, 185, 129, 0.15)', 
            border: '1px solid var(--color-signal-teal)', 
            borderRadius: '100px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-signal-teal)'
          }}>
            <BadgeCheck size={12} />
            <span>PAID & SECURED</span>
          </div>
        </div>

        <div className="ticket-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Event Details */}
          <div className="ticket-details">
            <span className="text-caption">EVENT</span>
            <h2 className="event-name" style={{ fontSize: '20px', fontWeight: 600, margin: '2px 0 0 0', color: 'white' }}>{event.name}</h2>
          </div>

          {/* Date / Time and Venue */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="ticket-details">
              <span className="text-caption" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> DATE & TIME
              </span>
              <span className="text-body" style={{ fontWeight: 500, marginTop: '2px' }}>{formattedDate}</span>
              <span className="text-caption" style={{ fontSize: '12px', marginTop: '1px' }}>{formattedTime}</span>
            </div>
            <div className="ticket-details">
              <span className="text-caption" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> VENUE
              </span>
              <span className="text-body" style={{ fontWeight: 500, marginTop: '2px' }}>{event.venue}</span>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }}></div>

          {/* Seats & Gate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="ticket-details">
              <span className="text-caption">SEATS</span>
              <span className="text-body text-mono" style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-signal-teal)', marginTop: '2px' }}>
                {seats.join(', ')}
              </span>
              <span className="text-caption" style={{ fontSize: '11px', marginTop: '1px' }}>Standard Reserved</span>
            </div>
            <div className="ticket-details">
              <span className="text-caption" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DoorOpen size={12} /> ENTRANCE
              </span>
              <span className="text-body" style={{ fontWeight: 500, marginTop: '2px' }}>{gate}</span>
            </div>
          </div>

          {/* Payment & Price Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {cardholderName ? (
              <div className="ticket-details">
                <span className="text-caption" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CreditCard size={12} /> PAYMENT METHOD
                </span>
                <span className="text-body" style={{ fontSize: '13px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {cardNumberMasked || '•••• •••• •••• 3212'}
                </span>
                <span className="text-caption" style={{ fontSize: '11px', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={10} /> {cardholderName}
                </span>
              </div>
            ) : (
              <div className="ticket-details">
                <span className="text-caption" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CreditCard size={12} /> PAYMENT METHOD
                </span>
                <span className="text-body" style={{ fontSize: '13px', marginTop: '2px' }}>Mock Card Transaction</span>
                <span className="text-caption" style={{ fontSize: '11px', marginTop: '1px' }}>Secure Checkout</span>
              </div>
            )}
            
            <div className="ticket-details">
              <span className="text-caption">TOTAL PAID</span>
              <span className="text-body text-mono" style={{ fontWeight: 600, fontSize: '16px', color: 'white', marginTop: '2px' }}>
                ${totalPrice.toFixed(2)}
              </span>
              <span className="text-caption" style={{ fontSize: '11px', marginTop: '1px' }}>
                ${(50.0).toFixed(2)} × {seats.length} ticket{seats.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="ticket-tear-line" style={{ margin: '8px 0' }}></div>

        <div className="ticket-stub" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div className="ticket-details" style={{ alignItems: 'center' }}>
            <span className="text-caption">BOOKING REFERENCE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
              <span className="text-body text-mono" style={{ fontWeight: 700, fontSize: '18px', color: 'white' }}>
                BK-{booking.id}
              </span>
              <button 
                onClick={handleCopyCode} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate)', display: 'flex', padding: 0 }}
                title="Copy Booking ID"
              >
                <Copy size={15} />
              </button>
            </div>
          </div>

          <div className="ticket-barcode" style={{ margin: '6px 0', fontSize: '20px', letterSpacing: '0.2em' }} aria-hidden="true">
            {barcodeText}
          </div>
          <span className="text-caption" style={{ fontSize: '10px', color: 'var(--color-slate-light)' }}>PRESENT BARCODE AT VELOCITY SCANNER</span>
        </div>
      </div>
    </div>
  );
};
