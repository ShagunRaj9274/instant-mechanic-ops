# Instant Mechanic — Live Operations Console

A production-shaped operations dashboard for a doorstep vehicle service company. It tracks
bookings from the moment a customer confirms to the moment a mechanic closes the job, and it
updates itself over WebSockets as jobs move.

**Live dashboard:** _add your Vercel URL_
**Live API:** _add your backend URL_
**API docs (Swagger):** _add your backend URL_`/api/docs`

Demo sign-in: `ops@instantmechanic.com` / `instant123`

---

## What this is

An operations lead opens one screen at the start of a shift and needs three answers: what is
stuck, who is free, and how the day is tracking against the last one. The dashboard is built
around those questions rather than around a list of CRUD screens.

- **Dispatch board first.** The overview opens with the five stages of a job — pending,
  assigned, on the way, in progress, completed — with live counts. Each stage links straight
  into the booking table, pre-filtered. Where work is piling up is the first thing you see.
- **The numbers move on their own.** A booking that changes status anywhere reaches every open
  console in under a second, through a WebSocket, with no page reload and no polling loop.
- **The state machine is enforced server-side.** A booking cannot jump from pending to
  completed, a job cannot be assigned without a mechanic, and every change writes an audit
  event. The timeline on a booking can never disagree with its status.

### Features

| Area | What it does |
| --- | --- |
| Overview | Dispatch board, 8 KPI tiles with period-over-period trends, bookings and revenue trends, top mechanics, live activity rail |
| Analytics | Bookings and revenue over time, status split, service category mix, revenue by city, category economics table, 7/30/90-day ranges |
| Bookings | Server-side search, multi-status filter, service and date filters, sortable columns, pagination, CSV export, detail page with full timeline and status actions |
| Mechanics | Availability at a glance, jobs completed, revenue closed, rating, the job each one is on right now, detail page with recent jobs and turnaround time |
| Customers | Lifetime spend, booking counts, vehicles, last booking, sortable and searchable |
| Realtime | Socket.IO with JWT handshake auth, room-scoped booking subscriptions, notification rail, live connection indicator |
| Auth | JWT sign-in, three roles (Admin, Operations, Viewer), viewers are blocked from mutations at the API, not just in the UI |
| Polish | Dark and light themes, skeleton loaders, empty states, error states with retry, responsive to mobile, keyboard focus rings, reduced-motion support |

---

## Tech stack

**Frontend** — Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query,
Recharts, Socket.IO client, next-themes, lucide-react. Deployed on Vercel.

**Backend** — Node.js 20, Express, TypeScript, Drizzle ORM, Socket.IO, Zod, JWT, Helmet,
express-rate-limit, Swagger UI. Deployed on AWS EC2 free tier behind Caddy.

**Database** — PostgreSQL (Neon free tier, or RDS / self-hosted — any Postgres 13+).

**Tooling** — Vitest, Docker, docker-compose, GitHub Actions.

### Why these choices

- **Drizzle over Prisma.** No engine binary to download at build or boot, which keeps the
  Docker image small and the EC2 deploy simple. It also lets analytics live in real SQL —
  window functions, `FILTER` clauses, lateral joins — rather than in a query-builder dialect
  that would need several round trips to say the same thing.
- **Socket.IO over raw WebSockets or SSE.** Reconnection, heartbeats and room broadcasting are
  handled, and the client falls back to long-polling if a corporate proxy blocks upgrades.
- **TanStack Query as the cache.** Socket events invalidate query keys, so one event refreshes
  whatever the operator happens to be looking at. There is no second source of truth in a
  global store to keep in sync.

---

## Architecture

```
                  Browser (Vercel)
   ┌───────────────────────────────────────────┐
   │  Next.js 15 App Router · React 19         │
   │  TanStack Query cache   Socket.IO client  │
   └──────────┬─────────────────────┬──────────┘
              │ HTTPS REST          │ WSS
              │ JWT bearer          │ JWT handshake
   ┌──────────▼─────────────────────▼──────────┐
   │  Caddy (TLS termination, reverse proxy)   │
   └──────────────────┬────────────────────────┘
                      │  AWS EC2 t2.micro
   ┌──────────────────▼────────────────────────┐
   │  Express API            Socket.IO server  │
   │  ┌─────────────────────────────────────┐  │
   │  │ routes → zod validation → service   │  │
   │  │ auth · rate limit · error funnel    │  │
   │  └─────────────────────────────────────┘  │
   │  Live simulator (writes + broadcasts)     │
   └──────────────────┬────────────────────────┘
                      │ Drizzle ORM (pooled)
   ┌──────────────────▼────────────────────────┐
   │  PostgreSQL                               │
   │  users · customers · vehicles · services  │
   │  mechanics · bookings · booking_events    │
   └───────────────────────────────────────────┘
```

**Request path.** A route parses query parameters with a Zod schema, hands typed input to a
service function, and the service is the only layer that touches the database. Controllers never
build SQL and services never touch `req` or `res`, so every service is callable from the
simulator and from tests without an HTTP server.

**Error path.** Everything funnels through one error middleware. Zod failures become `400` with
per-field detail, `ApiError` instances carry their own status and code, and anything unexpected
becomes a `500` that logs the real message and returns a safe one. Clients only ever parse two
shapes.

**Realtime path.** A status change — whether from an operator's click or from the simulator —
runs inside a transaction that updates the booking, appends an audit event and syncs the
mechanic's availability. Only after it commits does the server broadcast. Clients cannot
receive an event describing a state the database never reached.

### Data model

```
customers ──< vehicles ──┐
    │                    │
    └──────────────< bookings >───── services
                         │  │
                mechanics ┘  └──< booking_events
```

`booking_events` is append-only. It powers the timeline on a booking, the live activity rail,
and any question about how long a job spent in a stage. Booking amounts are `numeric(10,2)`
rather than floats, and indexes cover every column the dashboard filters or sorts on.

---

## Local setup

Requires Node 20+ and a PostgreSQL 13+ database.

```bash
git clone https://github.com/<your-username>/instant-mechanic-ops.git
cd instant-mechanic-ops
```

**1. Backend**

```bash
cd backend
cp .env.example .env          # set DATABASE_URL and JWT_SECRET
npm install
npm run db:push               # create tables from the Drizzle schema
npm run db:seed               # 680 bookings, 72 customers, 26 mechanics
npm run dev                   # http://localhost:4000
```

**2. Frontend** (in a second terminal)

```bash
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

Open http://localhost:3000 and sign in with `ops@instantmechanic.com` / `instant123`.

**Everything in Docker instead:**

```bash
docker compose up --build     # Postgres + API on :4000, seeded automatically
```

**Other commands**

```bash
npm test          # backend unit tests (state machine, auth hashing, pagination)
npm run typecheck # strict TypeScript, both packages
npm run db:reset  # wipe and regenerate the seed data
```

---

## Environment variables

**backend/.env**

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | Postgres connection string. Append `?sslmode=require` for Neon or RDS |
| `JWT_SECRET` | yes | — | Long random string. `openssl rand -base64 32` |
| `PORT` | no | `4000` | |
| `NODE_ENV` | no | `development` | |
| `CORS_ORIGINS` | no | `http://localhost:3000` | Comma separated. Must include your Vercel URL in production |
| `JWT_EXPIRES_IN` | no | `12h` | |
| `SIMULATOR_ENABLED` | no | `true` | Set `false` to run the API as a read-only service |
| `SIMULATOR_INTERVAL_MS` | no | `6000` | How often a job moves |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | |
| `RATE_LIMIT_MAX` | no | `300` | Requests per window per IP |

The API validates its environment with Zod at boot and exits with a readable message if
something is missing, rather than failing later inside a query.

**frontend/.env.local**

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | yes | Base URL of the API, no trailing slash. Used for both REST and the socket |

---

## API documentation

Interactive Swagger UI is served by the API itself at **`/api/docs`**, and the raw OpenAPI 3
document at **`/api/docs.json`**.

Every success returns `{ "success": true, "data": ... }`, list endpoints add a `meta` object,
and every failure returns `{ "success": false, "error": { code, message, details } }`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Exchange email and password for a JWT |
| `GET` | `/api/v1/auth/me` | Profile for the current token |
| `GET` | `/api/v1/dashboard` | Everything the overview needs in one call |
| `GET` | `/api/v1/dashboard/summary` | KPI tiles with trend deltas |
| `GET` | `/api/v1/dashboard/timeseries` | Bookings and revenue per day, gaps filled |
| `GET` | `/api/v1/dashboard/breakdown` | Split by status, service category and city |
| `GET` | `/api/v1/dashboard/activity` | Most recent status changes |
| `GET` | `/api/v1/bookings` | Search, filter, sort, paginate |
| `GET` | `/api/v1/bookings/export` | Same filters, returned as CSV |
| `GET` | `/api/v1/bookings/:id` | One booking with its full timeline |
| `PATCH` | `/api/v1/bookings/:id/status` | Move a booking along the dispatch flow |
| `GET` | `/api/v1/mechanics` | Field team, each with their current job |
| `GET` | `/api/v1/mechanics/:id` | One mechanic with stats and recent jobs |
| `PATCH` | `/api/v1/mechanics/:id/status` | Put a mechanic on or off shift |
| `GET` | `/api/v1/customers` | Customer book with lifetime spend |
| `GET` | `/api/v1/customers/:id` | One customer with vehicles |
| `GET` | `/api/v1/services` | Service catalogue |
| `GET` | `/health` | Liveness, database reachability, connected socket count |

**Booking list parameters:** `page`, `limit`, `search`, `status` (comma separated),
`serviceId`, `mechanicId`, `customerId`, `city`, `dateFrom`, `dateTo`, `minAmount`,
`maxAmount`, `sortBy`, `sortOrder`.

```bash
curl "$API/api/v1/bookings?status=PENDING,ASSIGNED&sortBy=amount&sortOrder=desc&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Socket events** — connect to the API origin, pass the JWT as `auth.token`:

| Event | Payload |
| --- | --- |
| `booking:created` | `{ booking, at }` |
| `booking:updated` | `{ booking, at, actor }` |
| `mechanic:updated` | `{ mechanic, at }` |
| `dashboard:stats` | `{ summary, at }` |

Clients can emit `booking:subscribe` with a booking id to join that booking's room and receive
only its updates.

---

## The live simulator

Nothing else writes to the database on its own, so the API ships with a simulator that plays
the part of the mechanic and customer mobile apps: it advances jobs through the flow, books new
ones, occasionally cancels one, takes mechanics off shift, and broadcasts each change. It writes
real rows through the same service functions and the same state machine as the API — it is not a
fake event emitter.

Set `SIMULATOR_ENABLED=false` to turn it off; the dashboard then updates only in response to
operator actions, which still travel over the socket to every other open console.

---

## Deployment

Deployment is covered step by step in **[DEPLOYMENT.md](./DEPLOYMENT.md)**, including the piece
that catches most people out: a Vercel frontend is served over HTTPS and browsers will block it
from calling a plain-HTTP EC2 box, so the API needs TLS. The guide sets that up with a free
DuckDNS subdomain and Caddy, which obtains and renews a certificate automatically.

In short: Postgres on Neon, the API on an EC2 `t2.micro` behind Caddy managed by systemd, and
the frontend on Vercel with `NEXT_PUBLIC_API_URL` pointing at the API's HTTPS domain. A GitHub
Actions workflow typechecks, tests and builds both packages on every push.

---

## Testing and CI

```bash
cd backend && npm test
```

Unit tests cover the dispatch state machine (the happy path, rejected jumps, terminal states),
password hashing and verification, and pagination boundaries. They are deliberately free of
database dependencies so CI runs them without a service container.

`.github/workflows/ci.yml` runs typecheck, tests and a production build of both packages on
every push and pull request.

---

## AI usage

I used **Claude** as an engineering assistant throughout, and treated its output as a first
draft to review rather than as finished code.

**Where it helped most**

- Scaffolding repetitive, well-understood layers: the Express route files, the Zod query
  schemas, the OpenAPI document, and the React table and card components.
- Writing the seed generator, including the realistic Indian names, vehicle models and service
  catalogue.
- Drafting the SQL for the analytics endpoints, particularly the `generate_series` join that
  fills empty days in the timeseries and the lateral join that attaches each mechanic's current
  job.
- Sanity-checking the CORS, Helmet and rate-limit configuration.

**What I changed or decided myself**

- The product shape. The dispatch board as the opening element, the choice of KPIs, and the
  decision to link every pipeline stage into a pre-filtered table were mine; the first drafts
  produced a conventional grid of four cards.
- The state machine. I moved transition rules into a single table that both the API and the
  simulator import, so the rules cannot drift apart, and wrapped each transition in a
  transaction covering the booking row, the audit event and the mechanic's availability.
- Query correctness. Early generated versions of the mechanics list used string interpolation
  for filters and a separate `COUNT` query; I rewrote them as fully parameterised SQL with a
  `count(*) OVER()` window so filters and totals cannot disagree.
- Realtime behaviour. I added the debounce that batches cache invalidations, so a busy hour
  cannot turn into a refetch per event.
- Verification. I ran the whole stack locally against PostgreSQL and checked each endpoint,
  every error path, the role restrictions, the illegal-transition rejections and the socket
  broadcast before considering any of it done.

---

## What I would build next

Mechanic locations on a live map (the coordinates are already in the schema and returned by the
API), Redis caching for the dashboard aggregates so the KPI query does not run per client, a
proper migration history instead of `db:push`, and Playwright coverage of the dispatch flow.
