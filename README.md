# Instant Mechanic — Live Operations Console

A production-shaped operations dashboard for a doorstep vehicle service company. It tracks bookings from the moment a customer confirms to the moment a mechanic closes the job, and updates itself in real time as jobs move through the dispatch workflow.

**Live dashboard:** https://instant-mechanic-ops.vercel.app

**Live API:** http://13.235.49.166:4000

**API documentation (Swagger):** http://13.235.49.166:4000/api/docs

**OpenAPI JSON:** http://13.235.49.166:4000/api/docs.json

**API health:** http://13.235.49.166:4000/health

**GitHub repository:** https://github.com/ShagunRaj9274/instant-mechanic-ops

**Demo sign-in:** `ops@instantmechanic.com` / `instant123`

---

## What This Is

An operations lead opens one screen at the start of a shift and needs three answers:

1. What is stuck?
2. Who is available?
3. How is the day tracking?

The dashboard is designed around these operational questions rather than a collection of basic CRUD screens.

### Key Product Decisions

* **Dispatch board first:** The overview opens with the five stages of a job — pending, assigned, on the way, in progress, and completed — with live counts.
* **Live operational updates:** Booking and mechanic changes are delivered through Socket.IO without requiring a page reload.
* **Server-side state machine:** Booking transitions are validated by the backend so invalid status jumps cannot be performed from the UI or API.
* **Auditability:** Booking changes are recorded as booking events, providing a consistent timeline for each job.
* **Role-based access:** Authentication and authorization are enforced at the API layer rather than relying only on frontend controls.

---

## Features

| Area               | What it does                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**       | Dispatch board, KPI tiles, booking and revenue trends, top mechanics, and live activity                                                       |
| **Analytics**      | Booking and revenue trends, status breakdown, service category mix, city breakdown, and time ranges                                           |
| **Bookings**       | Search, filtering, sorting, pagination, CSV export, booking details, timeline, and status actions                                             |
| **Mechanics**      | Availability, completed jobs, revenue, rating, current assignment, recent jobs, and turnaround information                                    |
| **Customers**      | Customer search, booking history, lifetime spend, vehicles, and last booking                                                                  |
| **Realtime**       | Socket.IO connection, live booking updates, mechanic updates, dashboard statistics, and booking subscriptions                                 |
| **Authentication** | JWT authentication with Admin, Operations, and Viewer roles                                                                                   |
| **UX**             | Responsive interface, loading states, empty states, error handling, retry actions, themes, keyboard accessibility, and reduced-motion support |

---

## Tech Stack

### Frontend

* Next.js 15
* React 19
* TypeScript
* Tailwind CSS
* TanStack Query
* Recharts
* Socket.IO Client
* next-themes
* lucide-react
* Vercel

### Backend

* Node.js 20
* Express
* TypeScript
* Drizzle ORM
* PostgreSQL
* Socket.IO
* Zod
* JWT
* Helmet
* express-rate-limit
* Swagger UI
* AWS EC2

### Database

* PostgreSQL
* Neon PostgreSQL for the deployed environment

### Tooling

* Vitest
* Docker
* Docker Compose
* GitHub Actions
* Git/GitHub

---

## Why These Technologies?

### Drizzle ORM

Drizzle provides a lightweight typed database layer and keeps database queries close to SQL. This is useful for the analytics-heavy parts of the dashboard where filtering, aggregation, window functions, and reporting queries are important.

### Socket.IO

Socket.IO provides connection management, reconnection, heartbeats, and event broadcasting while keeping the realtime layer straightforward to integrate with the React frontend.

### TanStack Query

TanStack Query manages API data and caching. Socket events can invalidate relevant query keys so the dashboard refreshes the affected data without maintaining a second global source of truth.

### PostgreSQL

PostgreSQL provides relational integrity and is well suited to the booking, customer, mechanic, service, and audit-event relationships used by the application.

---

## Architecture

```text
                         Browser
                            │
             ┌──────────────┴──────────────┐
             │                             │
       REST API Calls                 Socket.IO
             │                             │
             │ JWT                         │ JWT
             ▼                             ▼
     ┌─────────────────────────────────────────┐
     │             Node.js / Express           │
     │                                         │
     │  Routes → Validation → Services         │
     │                    │                    │
     │                    ▼                    │
     │              Drizzle ORM                │
     │                    │                    │
     │              Live Simulator             │
     └────────────────────┬────────────────────┘
                          │
                          ▼
                  ┌─────────────────┐
                  │ PostgreSQL /    │
                  │ Neon Database   │
                  └─────────────────┘
```

### Request Path

A request enters through an API route, is validated with Zod, and is passed to the service layer.

The service layer is responsible for database operations and business logic. This keeps controllers thin and makes business logic reusable by the simulator and tests.

### Error Path

Errors are handled through centralized error middleware.

Validation errors return a structured `400` response, application errors return their appropriate HTTP status and error code, and unexpected errors are converted into safe `500` responses.

### Realtime Path

When a booking or mechanic changes:

1. The request is validated.
2. Business rules are checked.
3. The database is updated.
4. Booking events are recorded.
5. Relevant realtime events are broadcast through Socket.IO.
6. Connected dashboards refresh their affected data.

---

## Data Model

```text
customers ──< vehicles ──┐
    │                    │
    └──────────────< bookings >───── services
                         │
                         │
                     mechanics
                         │
                         └──< booking_events
```

### Main Entities

* `users`
* `customers`
* `vehicles`
* `services`
* `mechanics`
* `bookings`
* `booking_events`

`booking_events` provides the audit trail used for booking timelines and realtime activity.

---

# Local Setup

## Requirements

* Node.js 20+
* npm
* PostgreSQL 13+
* Git

### Clone the repository

```bash
git clone https://github.com/ShagunRaj9274/instant-mechanic-ops.git
cd instant-mechanic-ops
```

---

## Backend Setup

```bash
cd backend
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Configure your database and JWT secret.

Then run:

```bash
npm run db:push
npm run db:seed
npm run dev
```

The backend will run at:

```text
http://localhost:4000
```

Swagger documentation:

```text
http://localhost:4000/api/docs
```

Health endpoint:

```text
http://localhost:4000/health
```

---

## Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create:

```text
.env.local
```

Set:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Then run:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:3000
```

Sign in with:

```text
Email: ops@instantmechanic.com
Password: instant123
```

---

## Docker Setup

The repository also includes Docker Compose configuration.

From the repository root:

```bash
docker compose up --build
```

This can be used to run the application stack with PostgreSQL and the backend in containers.

---

# Environment Variables

## Backend

Create:

```text
backend/.env
```

| Variable                | Required | Default                 | Description                     |
| ----------------------- | -------- | ----------------------- | ------------------------------- |
| `DATABASE_URL`          | Yes      | —                       | PostgreSQL connection string    |
| `JWT_SECRET`            | Yes      | —                       | Secret used to sign JWT tokens  |
| `PORT`                  | No       | `4000`                  | Backend server port             |
| `NODE_ENV`              | No       | `development`           | Application environment         |
| `CORS_ORIGINS`          | No       | `http://localhost:3000` | Allowed frontend origins        |
| `JWT_EXPIRES_IN`        | No       | `12h`                   | JWT expiration duration         |
| `SIMULATOR_ENABLED`     | No       | `true`                  | Enables/disables live simulator |
| `SIMULATOR_INTERVAL_MS` | No       | `6000`                  | Simulator update interval       |
| `RATE_LIMIT_WINDOW_MS`  | No       | `60000`                 | Rate-limit window               |
| `RATE_LIMIT_MAX`        | No       | `300`                   | Maximum requests per window     |

For Neon PostgreSQL, use the connection string supplied by Neon.

**Do not commit `.env` files or database credentials to GitHub.**

---

## Frontend

Create:

```text
frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

For production, this should point to the deployed API origin.

---

# API Documentation

The deployed API provides interactive Swagger documentation.

### Swagger UI

http://13.235.49.166:4000/api/docs

### OpenAPI JSON

http://13.235.49.166:4000/api/docs.json

### Health Check

http://13.235.49.166:4000/health

---

## API Base URL

```text
http://13.235.49.166:4000/api/v1
```

---

## Authentication

### Login

```http
POST /api/v1/auth/login
```

Example:

```json
{
  "email": "ops@instantmechanic.com",
  "password": "instant123"
}
```

The endpoint returns a JWT that is used for authenticated API requests.

### Current User

```http
GET /api/v1/auth/me
```

---

# Dashboard APIs

```http
GET /api/v1/dashboard
GET /api/v1/dashboard/summary
GET /api/v1/dashboard/timeseries
GET /api/v1/dashboard/breakdown
GET /api/v1/dashboard/activity
```

These endpoints provide the KPI, trend, breakdown, and live activity data used by the operations dashboard.

---

# Booking APIs

```http
GET /api/v1/bookings
GET /api/v1/bookings/export
GET /api/v1/bookings/:id
PATCH /api/v1/bookings/:id/status
```

### Booking List Filters

Supported filters include:

```text
page
limit
search
status
serviceId
mechanicId
customerId
city
dateFrom
dateTo
minAmount
maxAmount
sortBy
sortOrder
```

Example:

```bash
curl "http://13.235.49.166:4000/api/v1/bookings?status=PENDING,ASSIGNED&sortBy=amount&sortOrder=desc&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

# Mechanic APIs

```http
GET /api/v1/mechanics
GET /api/v1/mechanics/:id
PATCH /api/v1/mechanics/:id/status
```

These endpoints provide mechanic availability, assignments, statistics, and status management.

---

# Customer APIs

```http
GET /api/v1/customers
GET /api/v1/customers/:id
```

---

# Service APIs

```http
GET /api/v1/services
```

---

# Health API

```http
GET /health
```

The deployed endpoint is:

http://13.235.49.166:4000/health

Example response:

```json
{
  "status": "ok",
  "database": "connected",
  "realtimeClients": 0
}
```

---

# Booking State Machine

Bookings follow a controlled dispatch workflow:

```text
PENDING
   ↓
ASSIGNED
   ↓
ON_THE_WAY
   ↓
IN_PROGRESS
   ↓
COMPLETED
```

A booking may also be cancelled where permitted.

Invalid transitions are rejected by the backend instead of relying on frontend validation.

This prevents clients from bypassing the dispatch workflow by directly calling the API.

---

# Realtime Updates

Realtime communication uses Socket.IO.

The deployed Socket.IO endpoint is available from the API origin:

```text
http://13.235.49.166:4000
```

JWT authentication is supplied during the Socket.IO handshake.

### Realtime Events

| Event              | Description                  |
| ------------------ | ---------------------------- |
| `booking:created`  | A new booking was created    |
| `booking:updated`  | A booking changed            |
| `mechanic:updated` | A mechanic changed           |
| `dashboard:stats`  | Dashboard statistics changed |

Clients can subscribe to a particular booking to receive updates relevant to that booking.

---

# Live Simulator

The backend includes a live simulator that represents activity coming from customer and mechanic applications.

It can:

* Advance bookings through dispatch states
* Create new bookings
* Cancel bookings
* Change mechanic availability
* Broadcast realtime updates
* Exercise the same business logic used by API requests

The simulator can be disabled using:

```env
SIMULATOR_ENABLED=false
```

This allows the API to operate without simulated activity.

---

# Deployment

## Current Deployment

### Frontend

The frontend is intended to be deployed on Vercel.

```text
Vercel
   ↓
Next.js Frontend
```

**Live dashboard:**

```text
YOUR_VERCEL_URL
```

Replace this with the actual Vercel deployment URL.

### Backend

The backend is deployed on AWS EC2.

```text
AWS EC2
   ↓
Node.js / Express
   ↓
PostgreSQL / Neon
```

### Backend URL

http://13.235.49.166:4000

### Swagger

http://13.235.49.166:4000/api/docs

### OpenAPI

http://13.235.49.166:4000/api/docs.json

### Health

http://13.235.49.166:4000/health

### Database

The deployed backend connects to PostgreSQL hosted on Neon.

---

# Repository Structure

```text
instant-mechanic-ops/
│
├── backend/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── ...
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── package.json
│   └── ...
│
├── deploy/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── DEPLOYMENT.md
├── SUBMISSION.md
└── README.md
```

---

# Testing

Backend tests can be run with:

```bash
cd backend
npm test
```

The test suite covers important backend behavior including:

* Booking state transitions
* Rejected/invalid transitions
* Authentication behavior
* Password hashing and verification
* Pagination behavior

Type checking can be run with:

```bash
npm run typecheck
```

---

# CI

GitHub Actions is included in the repository for automated validation.

The CI workflow is responsible for checking the project during development and helps catch:

* TypeScript errors
* Test failures
* Production build issues

---

# Security and Reliability

The backend includes several protections:

* JWT authentication
* Role-based authorization
* Zod input validation
* Helmet security headers
* Rate limiting
* Centralized error handling
* Server-side booking state validation
* Parameterized database operations
* Environment-based secret configuration

Sensitive credentials are stored through environment variables rather than source code.

---

# AI Usage

AI tools were used as engineering assistants during development, primarily **ChatGPT and Claude**.

They were used for:

* Debugging implementation issues
* Reviewing architecture decisions
* Generating and refining boilerplate
* API documentation assistance
* SQL/query suggestions
* Backend and frontend troubleshooting
* Deployment troubleshooting
* Reviewing security configuration
* Improving project documentation

AI-generated suggestions were treated as drafts rather than automatically accepted code. The implementation was reviewed, modified, tested, and integrated manually.

### Human Decisions and Implementation

The core product decisions were made around the operational workflow of the application, including:

* Making the dispatch board the primary dashboard element
* Designing the booking state machine
* Connecting booking status changes to mechanic availability
* Providing booking timelines and audit events
* Implementing realtime dashboard updates
* Designing search, filtering, pagination, and analytics behavior
* Testing API behavior and invalid state transitions
* Deploying and troubleshooting the backend on AWS EC2

---

# Future Improvements

Potential next improvements include:

* Live mechanic location tracking
* Map-based dispatch visualization
* Redis caching for dashboard aggregates
* More extensive automated end-to-end testing
* Playwright coverage for critical dispatch workflows
* Database migration history
* Advanced operational alerts
* Push notifications for critical booking events
* More granular role and permission management

---

# Links

| Resource           | URL                                                   |
| ------------------ | ----------------------------------------------------- |
| **GitHub**         | https://github.com/ShagunRaj9274/instant-mechanic-ops |
| **Live Dashboard** | `YOUR_VERCEL_URL`                                     |
| **Live API**       | http://13.235.49.166:4000                             |
| **Swagger UI**     | http://13.235.49.166:4000/api/docs                    |
| **OpenAPI JSON**   | http://13.235.49.166:4000/api/docs.json               |
| **Health Check**   | http://13.235.49.166:4000/health                      |

---

# Demo Credentials

```text
Email: ops@instantmechanic.com
Password: instant123
```

> These credentials are intended for evaluation/demo purposes only.
