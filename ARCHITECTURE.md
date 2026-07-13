# Technical Architecture: Aiseatbooking

This document provides a detailed technical overview of the design decisions, concurrency models, and system architecture used in the Aiseatbooking project.

## System Overview

The system is a distributed, transactional seat booking engine. It is designed to handle high-concurrency "thundering herd" scenarios where thousands of users may attempt to claim the same resource (a seat) within a very short window.

The architecture prioritizes **data integrity** and **low latency** by separating the "intent to book" (the Hold) from the "actual booking" (the Transaction).

## Concurrency and Locking Strategy

The core engineering challenge is managing seat availability without causing database deadlocks or allowing double-bookings. We use a two-tiered locking strategy.

### Tier 1: Distributed Reservation (The "Hold" Layer)
To minimize the load on the primary relational database, we implement a lightweight reservation layer using **Redis**.

- **Mechanism:** When a user selects a seat, the system creates a key in Redis: `hold:seat:{seatId}` with a value containing the `userId` and an expiration timestamp.
- **TTL (Time-To-Live):** These holds are set with a 5-minute TTL. 
- **Benefit:** This provides immediate feedback to other users (the seat appears "Held") without requiring a heavy database write or a long-lived row lock. It effectively "soft-locks" the resource.
- **Cleanup:** A background scheduler (`SeatHoldCleanupScheduler`) periodically synchronizes expired Redis holds with the database to ensure the seat status reverts to `AVAILABLE`.

### Tier 2: Atomic Commitment (The "Transaction" Layer)
When the user proceeds to payment, the system transitions from a "soft-lock" to a "hard-lock" using **RDBMS Pessimistic Locking**.

- **Mechanism:** During the `BookingTransactionService` execution, we perform a `SELECT ... FOR UPDATE` on the specific seat rows in PostgreSQL.
- **Atomicity:** This ensures that even if two processes attempt to finalize a booking for the same seat at the exact same microsecond, the database will serialize the requests. One will acquire the lock and succeed; the other will wait, fail the hold-validation check, and be rejected.
- **Scope:** This lock is held only for the duration of the critical section: validating the hold, processing the payment, and updating the seat/booking status.

## Data Flow: The Booking Lifecycle

### The Happy Path
1. **User Action:** User selects seats via the UI.
2. **Hold Request:** `POST /api/holds` is called.
3. **Redis Entry:** A TTL-based hold is created in Redis.
4. **UI Update:** The seat map updates via Supabase Realtime.
5. **Payment Request:** User submits payment via `POST /api/bookings/confirm`.
6. **DB Lock:** Backend acquires a pessimistic lock on the seats.
7. **Verification:** System verifies the Redis hold is still valid and owned by the user.
8. **Commitment:** Payment is processed $ightarrow$ Booking record is created $ightarrow$ Seat status is updated to `BOOKED` $ightarrow$ Redis hold is cleared.
9. **Broadcast:** PostgreSQL change events are captured and broadcast via Supabase.

### The Compensating Transaction (Failure Path)
If the payment fails (e.g., insufficient funds, timeout), the system must ensure the seat is not left in a "zombie" held state.

1. **Detection:** The `BookingService` catches a `PaymentFailedException`.
2. **Rollback:** The database transaction is rolled back (the seat remains `AVAILABLE`).
3. **Compensation:** An explicit command is sent to Redis to delete the `hold:{seatId}` key.
4. **Recovery:** The seat immediately becomes available for other users in the UI.

## Real-Time Synchronization Engine

To prevent the "stale UI" problem (where a user clicks a seat that was just taken), we use **Change Data Capture (CDC)**.

- **Flow:** PostgreSQL $ightarrow$ Supabase Realtime $ightarrow$ Frontend (React).
- **Implementation:** The frontend subscribes to the `seats` table. Whenever a row is updated in the database, Supabase pushes the new state to all active WebSocket connections. This ensures that the "source of truth" (the database) is always reflected in the user interface with sub-second latency.

## AI Orchestration Layer

The AI agent is designed as a **client of the existing API**, not a bypass.

- **Intent Parsing:** An LLM (Claude) interprets natural language (e.g., *"Find me a seat for Dune"*) and extracts entities (Event, Seat Count, Preferences).
- **Tool Execution:** The AI agent is provided with "tools" that map directly to the `SeatHoldService` and `EventService`. 
- **Safety:** Because the AI uses the `POST /api/holds` endpoint, every AI-suggested reservation is subject to the same Redis TTL and database locking constraints as a manual user booking.

## Complexity Analysis & Trade-offs

| Decision | Trade-off |
| :--- | :--- |
| **Redis vs. DB for Holds** | **Pro:** Much higher throughput and lower DB contention. **Con:** Adds a dependency on a distributed cache and requires synchronization logic. |
| **Pessimistic vs. Optimistic Locking** | **Pro:** Guaranteed consistency in high-contention scenarios. **Con:** Higher latency for the specific thread holding the lock. |
| **Supabase vs. Polling** | **Pro:** Extremely low latency and reduced network overhead. **Con:** Increased architectural complexity and WebSocket management. |
