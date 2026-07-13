import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import type { Event, Seat, Booking } from './lib/api';
import { EventList } from './components/EventList';
import { SeatMap } from './components/SeatMap';
import { BookingSummary } from './components/BookingSummary';
import { TicketConfirmation } from './components/TicketConfirmation';
import { AiChat } from './components/AiChat';
import { InterviewerDashboard } from './components/InterviewerDashboard';
import { supabase } from './lib/supabase';
import { Ticket, Sun, Moon } from 'lucide-react';

const App: React.FC = () => {
  const activeUserId = 'interviewer-sandbox-user';
  
  const [screen, setScreen] = useState<'events' | 'seat-selection' | 'confirmation'>('events');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Theme state
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.body.classList.toggle('light-theme', !isDark);
  }, [isDark]);
  
  // Seat state
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [heldSeatIds, setHeldSeatIds] = useState<number[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);
  const [activeHoldId, setActiveHoldId] = useState<string | null>(null);
  
  // Booking state
  const [bookingResult, setBookingResult] = useState<Booking | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Idempotency key (persists across checkout retries)
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // Fetch seats and set up real-time subscription or polling
  const refreshSeats = () => {
    if (!selectedEvent) return;
    api.getSeats(selectedEvent.id)
      .then(data => setSeats(data))
      .catch(err => console.error('Failed to refresh seats:', err));
  };

  useEffect(() => {
    if (!selectedEvent) {
      setSeats([]);
      return;
    }

    refreshSeats();

    // Try Supabase realtime first
    if (supabase) {
      const channel = supabase
        .channel(`seats-event-${selectedEvent.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'seats',
            filter: `event_id=eq.${selectedEvent.id}`,
          },
          () => {
            refreshSeats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback: poll every 3 seconds
      const interval = setInterval(refreshSeats, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedEvent]);

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setScreen('seat-selection');
    setSelectedSeatIds([]);
    setHeldSeatIds([]);
    setHoldExpiresAt(null);
    setActiveHoldId(null);
    setError(null);
    setIdempotencyKey(crypto.randomUUID());
  };

  const handleToggleSeat = (seatId: number) => {
    if (heldSeatIds.length > 0) return;
    setSelectedSeatIds(prev =>
      prev.includes(seatId) ? prev.filter(id => id !== seatId) : [...prev, seatId]
    );
  };

  const handleHoldSeats = async () => {
    if (!selectedEvent || selectedSeatIds.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await api.holdSeats(selectedEvent.id, selectedSeatIds, activeUserId);
      setHeldSeatIds(selectedSeatIds);
      setActiveHoldId(result.holdId);
      setHoldExpiresAt(Date.now() + 5 * 60 * 1000);
      setSelectedSeatIds([]);
      refreshSeats();
    } catch (err: any) {
      setError(err.message || 'Failed to hold seats. Someone may have grabbed them first!');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReleaseHold = async () => {
    if (!activeHoldId) return;
    setIsProcessing(true);
    try {
      await api.releaseHold(activeHoldId);
      setHeldSeatIds([]);
      setActiveHoldId(null);
      setHoldExpiresAt(null);
      refreshSeats();
    } catch (err: any) {
      setError(err.message || 'Failed to release hold.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!activeHoldId || !selectedEvent) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await api.confirmBooking(
        activeHoldId,
        heldSeatIds.length * 50.0,
        idempotencyKey
      );
      setBookingResult(result);
      setScreen('confirmation');
      setHeldSeatIds([]);
      setActiveHoldId(null);
      setHoldExpiresAt(null);
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHoldExpire = () => {
    setHeldSeatIds([]);
    setActiveHoldId(null);
    setHoldExpiresAt(null);
    setError('Your hold has expired. Please select seats again.');
    refreshSeats();
  };

  // Handle AI proposal acceptance (navigate to seat selection)
  const handleAcceptAiProposal = (eventId: number, seatIds: number[]) => {
    api.getEvents().then(events => {
      const event = events.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setScreen('seat-selection');
        setSelectedSeatIds(seatIds);
        setHeldSeatIds([]);
        setHoldExpiresAt(null);
        setActiveHoldId(null);
        setError(null);
        setIdempotencyKey(crypto.randomUUID());
      }
    });
  };

  // Handle AI hold success (backend already locked seats)
  const handleAiHoldSuccess = (eventId: number, holdId: string, seatIds: number[], expiresAt: number) => {
    api.getEvents().then(events => {
      const event = events.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setScreen('seat-selection');
        setSelectedSeatIds([]);
        setHeldSeatIds(seatIds);
        setActiveHoldId(holdId);
        setHoldExpiresAt(expiresAt);
        setError(null);
        setIdempotencyKey(crypto.randomUUID());
      }
    });
  };

  const getSelectedSeatsMetadata = () => {
    const ids = heldSeatIds.length > 0 ? heldSeatIds : selectedSeatIds;
    return ids.map(id => {
      const seat = seats.find(s => s.id === id);
      return { id, label: seat ? seat.seatLabel : `Seat ${id}` };
    });
  };

  return (
    <div className="app-grid">
      {/* 1. Left Sidebar: Persistent AI Assistant */}
      <AiChat
        onAcceptProposal={handleAcceptAiProposal}
        onHoldSuccess={handleAiHoldSuccess}
        availableSeats={seats}
        currentEventId={selectedEvent ? selectedEvent.id : null}
        userId={activeUserId}
      />

      {/* 2. Right Column: Main workspace */}
      <div className="main-workspace">
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Ticket size={20} />
            <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>Ticket Booking</span>
          </div>
          <button
            className="theme-toggle-btn"
            onClick={() => setIsDark(prev => !prev)}
            aria-label="Toggle theme"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </header>

        {/* Live Concurrency Control Panel */}
        <InterviewerDashboard 
          eventId={selectedEvent ? selectedEvent.id : null} 
          onRefreshSeats={refreshSeats} 
        />

        {/* Screen Content Router */}
        {screen === 'events' && (
          <EventList onSelectEvent={handleSelectEvent} />
        )}

        {screen === 'seat-selection' && selectedEvent && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span className="text-caption" style={{ fontWeight: 500 }}>SELECTION GRID</span>
                <h1 style={{ marginTop: '2px', fontSize: '24px' }}>{selectedEvent.name}</h1>
                <p className="text-body" style={{ marginTop: '2px', fontSize: '12px' }}>
                  {selectedEvent.venue} • {new Date(selectedEvent.datetime).toLocaleString()}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => setScreen('events')} disabled={isProcessing}>
                &larr; Back to Listings
              </button>
            </div>

            <div className="booking-view-layout">
              {/* Map Panel */}
              <SeatMap
                seats={seats}
                selectedSeatIds={selectedSeatIds}
                heldSeatIds={heldSeatIds}
                onToggleSeat={handleToggleSeat}
              />

              {/* Sidebar Panel */}
              <BookingSummary
                selectedSeats={getSelectedSeatsMetadata()}
                heldSeatsCount={heldSeatIds.length}
                holdExpiresAt={holdExpiresAt}
                ticketPrice={50.0}
                onHold={handleHoldSeats}
                onConfirm={handleConfirmBooking}
                onRelease={handleReleaseHold}
                onExpire={handleHoldExpire}
                isProcessing={isProcessing}
                error={error}
              />
            </div>
          </div>
        )}

        {screen === 'confirmation' && selectedEvent && bookingResult && (
          <TicketConfirmation
            event={selectedEvent}
            booking={bookingResult}
            seats={getSelectedSeatsMetadata().map(s => s.label)}
            totalPrice={heldSeatIds.length * 50.0}
            onBack={() => {
              setScreen('events');
              setSelectedEvent(null);
              setBookingResult(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default App;
