const API_BASE_URL = 'http://localhost:8080';

export interface Event {
  id: number;
  name: string;
  venue: string;
  datetime: string;
  totalSeats: number;
}

export interface Seat {
  id: number;
  seatLabel: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  version: number;
}

export interface HoldResponse {
  holdId: string;
  eventId: number;
  seatIds: number[];
  expiresAt: number;
}

export interface Booking {
  id: number;
  userId: string;
  eventId: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  userId?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (options.idempotencyKey) {
    headers.set('X-Idempotency-Key', options.idempotencyKey);
  }
  if (options.userId) {
    headers.set('X-User-Id', options.userId);
  } else {
    headers.set('X-User-Id', 'mock-user-123'); // Default mock user
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! Status: ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Events
  getEvents: (): Promise<Event[]> => {
    return request<Event[]>('/api/events');
  },
  
  getEvent: (id: number): Promise<Event> => {
    return request<Event>(`/api/events/${id}`);
  },

  // Seats
  getSeats: (eventId: number): Promise<Seat[]> => {
    return request<Seat[]>(`/api/seats?eventId=${eventId}`);
  },

  // Holds
  holdSeats: (eventId: number, seatIds: number[], userId?: string): Promise<HoldResponse> => {
    return request<HoldResponse>('/api/holds', {
      method: 'POST',
      body: JSON.stringify({ eventId, seatIds }),
      userId,
    });
  },

  releaseHold: (holdId: string): Promise<void> => {
    return request<void>(`/api/holds/${holdId}`, {
      method: 'DELETE',
    });
  },

  // Bookings
  confirmBooking: (holdId: string, ticketPrice: number, idempotencyKey?: string, userId?: string): Promise<Booking> => {
    return request<Booking>('/api/bookings/confirm', {
      method: 'POST',
      body: JSON.stringify({ holdId, ticketPrice }),
      idempotencyKey,
      userId,
    });
  },

  getBooking: (id: number): Promise<Booking> => {
    return request<Booking>(`/api/bookings/${id}`);
  },

  getUserBookings: (userId: string): Promise<Booking[]> => {
    return request<Booking[]>(`/api/users/${userId}/bookings`);
  },

  aiChat: (message: string, currentEventId: number | null, userId?: string): Promise<{
    sender: string;
    text: string;
    action?: string;
    holdDetails?: {
      holdId: string;
      eventId: number;
      seatIds: number[];
      expiresAt: number;
    };
    proposal?: {
      eventId: number;
      eventName: string;
      seatIds: number[];
      seatLabels: string[];
      price: number;
    };
  }> => {
    return request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, currentEventId, userId }),
    });
  }
};
