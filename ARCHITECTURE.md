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

## Natural Language Booking Assistant

Instead of using an external cloud LLM (such as Anthropic Claude or OpenAI), the conversational feature is built around an **offline pattern matching and heuristic NLP engine** running natively on the Spring Boot backend (`AiOrchestrationController`).

- **Intent & Movie Parsing:** It scans the user's natural language input and dynamically matches keywords against active event/movie titles retrieved from the database.
- **Seat Coordinates Parsing:** Regex patterns (such as `\b([a-eA-E][1-8])\b`) are used to extract specific coordinates (e.g. A1, C3).
- **Quantity Parsing:** Heuristics look for quantity words or numbers (e.g. "two", "three", "couple") to automatically suggest adjacent seating layouts.
- **API Client Flow:** Like a human user, the assistant behaves as a standard client of the `SeatHoldService` and the `/api/holds` endpoint, preserving the exact same Redis locking, TTL, and pessimistic database lock behaviors.
- **Limitations:**
  - The engine operates within a defined grammar of expected inputs (movie names, seat names, quantity terms).
  - It does not support arbitrary phrasing or general open-ended conversation outside the scope of ticket booking.
- **Design Rationale:**
  - **Zero Cost:** No subscription or tokens required for external API requests.
  - **Low Latency:** Instant response time (sub-millisecond parsing) by avoiding external network hops.
  - **Deterministic:** No risk of hallucinated seat coordinate suggestions or random conversational deviations.

## Complexity Analysis & Trade-offs

| Decision | Trade-off |
| :--- | :--- |
| **Redis vs. DB for Holds** | **Pro:** Much higher throughput and lower DB contention. **Con:** Adds a dependency on a distributed cache and requires synchronization logic. |
| **Pessimistic vs. Optimistic Locking** | **Pro:** Guaranteed consistency in high-contention scenarios. **Con:** Higher latency for the specific thread holding the lock. |
| **Supabase vs. Polling** | **Pro:** Extremely low latency and reduced network overhead. **Con:** Increased architectural complexity and WebSocket management. |
| **Local NLP vs. Cloud LLM** | **Pro:** Zero token cost, sub-millisecond local response, and 100% deterministic (no hallucination). **Con:** Less flexible for complex language structures, restricted to a predefined input grammar. |
