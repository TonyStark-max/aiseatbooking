# Aiseatbooking: Transactional Seat Booking System

A full-stack application designed to handle high-concurrency seat reservations. The system focuses on solving race conditions in ticket booking environments using a combination of distributed caching, database-level locking, and real-time state synchronization.

## Problem Statement

In high-demand booking scenarios (such as concert ticket sales), multiple users often attempt to reserve the same seat simultaneously. Traditional database transactions alone can lead to significant performance degradation or deadlocks under extreme load. This project implements a multi-layered approach to ensure data integrity and a responsive user experience.

## Core Functionality

### Concurrency Management
- **Distributed Holds:** Uses Redis with Time-To-Live (TTL) to manage temporary seat holds. This offloads the "reservation" state from the primary database, reducing contention.
- **Transactional Integrity:** Implements pessimistic locking (`SELECT ... FOR UPDATE`) during the final booking phase to ensure that only one user can successfully finalize a transaction for a specific seat.
- **Compensating Transactions:** Automatically releases held seats if the payment process fails or if the hold expires, ensuring seat availability is maintained accurately.

### Real-Time Synchronization
- **Live Updates:** Integrates Supabase Realtime to broadcast seat state changes (Available, Held, Booked) to all connected clients instantly, preventing users from attempting to book seats that were just taken.

### AI Orchestration
- **Natural Language Interface:** Includes an AI agent that parses user intent from natural language and executes booking workflows via the standard API, ensuring that AI-driven actions follow the same rigorous locking logic as human actions.

## Technology Stack

- **Backend:** Java 21, Spring Boot, Spring Data JPA, Spring Security
- **Data & Caching:** PostgreSQL, Redis
- **Frontend:** React, TypeScript, Vite, Vanilla CSS
- **Real-time:** Supabase (PostgreSQL Change Data Capture)
- **AI:** Claude API
- **Infrastructure:** Docker, Docker Compose

## Local Setup

### Prerequisites
- Docker and Docker Compose
- JDK 21
- Maven
- Node.js and npm

### Running the Application

1. **Infrastructure & Full Stack**
   Start the entire environment (Postgres, Redis, API, and Web) using Docker Compose:
   ```bash
   docker-compose up --build
   ```
   - The Backend API will be available at `http://localhost:8080`
   - The Frontend Web interface will be available at `http://localhost:3000`

## Testing
The project includes integration tests that simulate concurrent user access to validate the locking mechanisms and the reliability of the hold-and-release lifecycle.
