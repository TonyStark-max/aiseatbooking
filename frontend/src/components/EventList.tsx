import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Event } from '../lib/api';
import { Calendar, MapPin, Search } from 'lucide-react';

const getEventDesign = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('kalki')) {
    return {
      bannerUrl: 'https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=600&q=80',
      genre: 'TOLLYWOOD / SCI-FI'
    };
  } else if (n.includes('devara')) {
    return {
      bannerUrl: 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=600&q=80',
      genre: 'TOLLYWOOD / ACTION'
    };
  } else if (n.includes('pushpa')) {
    return {
      bannerUrl: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=600&q=80',
      genre: 'TOLLYWOOD / THRILLER'
    };
  } else if (n.includes('salaar')) {
    return {
      bannerUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80',
      genre: 'TOLLYWOOD / ACTION'
    };
  } else if (n.includes('deadpool') || n.includes('wolverine')) {
    return {
      bannerUrl: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=600&q=80',
      genre: 'HOLLYWOOD / COMEDY'
    };
  } else if (n.includes('inside out')) {
    return {
      bannerUrl: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&w=600&q=80',
      genre: 'HOLLYWOOD / ANIMATION'
    };
  } else if (n.includes('furiosa') || n.includes('mad max')) {
    return {
      bannerUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=600&q=80',
      genre: 'HOLLYWOOD / ACTION'
    };
  } else if (n.includes('dune')) {
    return {
      bannerUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
      genre: 'HOLLYWOOD / SCI-FI'
    };
  } else if (n.includes('oppenheimer')) {
    return {
      bannerUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=600&q=80',
      genre: 'HOLLYWOOD / DRAMA'
    };
  }
  return {
    bannerUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
    genre: 'CINEMA / GENERAL'
  };
};

interface EventListProps {
  onSelectEvent: (event: Event) => void;
}

export const EventList: React.FC<EventListProps> = ({ onSelectEvent }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getEvents()
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load events');
        setLoading(false);
      });
  }, []);

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.venue.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ marginTop: '20px' }}>
        <div className="skeleton-title skeleton"></div>
        <div className="events-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="event-card">
              <div className="skeleton-title skeleton" style={{ width: '80%' }}></div>
              <div className="skeleton-text skeleton" style={{ width: '40%' }}></div>
              <div className="skeleton-text skeleton" style={{ width: '60%' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container">
        <div style={{ textAlign: 'center' }}>
          <p className="text-error" style={{ fontSize: '16px' }}>Error: {error}</p>
          <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
        <h1>Browse Events</h1>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--color-slate)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by event or venue..."
            style={{ paddingLeft: '32px', width: '100%' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="loading-container" style={{ minHeight: '300px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--color-slate)', fontWeight: 400 }}>No events found</h2>
            <p className="text-caption" style={{ marginTop: '8px' }}>Try searching with a different term.</p>
          </div>
        </div>
      ) : (
        <div className="events-grid">
          {filteredEvents.map(event => {
            const date = new Date(event.datetime);
            const formattedDate = date.toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const design = getEventDesign(event.name);

            return (
              <div key={event.id} className="event-card" onClick={() => onSelectEvent(event)}>
                <div className="event-poster-wrapper">
                  <div className="poster-art" style={{ 
                    backgroundImage: `url(${design.bannerUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.6
                  }}></div>
                  <span className="tag-genre">{design.genre}</span>
                </div>
                <div className="event-card-content">
                  <div className="event-details">
                    <h2 className="event-name">{event.name}</h2>
                    <div className="event-meta" style={{ marginTop: '6px' }}>
                      <MapPin size={14} />
                      <span>{event.venue}</span>
                    </div>
                    <div className="event-meta">
                      <Calendar size={14} />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '4px' }}>
                    <span className="event-price">$50.00 <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 'normal' }}>/ seat</span></span>
                    <span style={{ fontSize: '13px', color: 'var(--color-signal-teal)', fontWeight: 600 }}>Select Seats &rarr;</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
