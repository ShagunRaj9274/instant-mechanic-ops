# Submission

Fill in the four blanks marked `<...>` after deploying, then paste this into your reply to
Team Instant Mechanic.

---

**1. Name**
`<your name>`

**2. GitHub repository**
`https://github.com/<your-username>/instant-mechanic-ops`

**3. Live dashboard (Vercel)**
`https://<your-project>.vercel.app`
Sign in with `ops@instantmechanic.com` / `instant123` — the login screen also has one-tap
buttons for the Admin and Viewer roles.

**4. Live backend**
`https://<your-api-domain>` — health check at `/health`

**5. API documentation**
`https://<your-api-domain>/api/docs` (Swagger UI, OpenAPI 3 JSON at `/api/docs.json`)

---

**6. Short architecture explanation**

Next.js 15 on Vercel talks to an Express + TypeScript API on an AWS EC2 t2.micro, which reads
and writes PostgreSQL through Drizzle ORM. Caddy sits in front of the API to terminate TLS,
which the browser requires since the dashboard itself is served over HTTPS.

The API is organised by module — auth, dashboard, bookings, mechanics, customers, services —
and each module splits into routes and a service. Routes validate input with Zod and shape
responses; services own all database access. Because services never touch `req` or `res`, the
live simulator and the tests call them directly. Every failure funnels through one error
middleware, so clients only ever parse two response shapes.

Realtime runs on Socket.IO alongside the same HTTP server, authenticated by the same JWT during
the handshake. When a booking's status changes, a single transaction updates the booking row,
appends an audit event to `booking_events` and syncs the assigned mechanic's availability;
only after that commits does the server broadcast. On the client, socket events invalidate
TanStack Query keys, so whichever table or chart is on screen refreshes itself without a page
reload and without a polling loop.

The dispatch state machine — pending → assigned → on the way → in progress → completed, with
cancellation available until a job finishes — lives in one module that both the API and the
simulator import, so the rules cannot drift apart. Illegal transitions are rejected with a 409.

**7. AI tools used**

Claude, as an engineering assistant. It scaffolded the repetitive layers (route files, Zod
schemas, the OpenAPI document, React table and card components), wrote the seed generator, and
drafted the analytics SQL. I made the product decisions, restructured the state machine into a
single shared module wrapped in transactions, rewrote the mechanics and customers queries as
fully parameterised SQL with `count(*) OVER()` after the first drafts used string interpolation
and a separate count query, added the debounce that batches realtime cache invalidations, and
verified the whole stack by hand against PostgreSQL — every endpoint, every error path, the
role restrictions, the rejected transitions and the socket broadcast. The README has a fuller
breakdown.

**8. What I am most proud of**

The dispatch board that opens the overview. Most dashboards start with four KPI cards; this one
starts with the five stages of a job and live counts under each, because the first question an
operations lead has is not "how much revenue" but "where is work piling up right now". Each
stage links straight into the booking table pre-filtered by that status, so noticing a problem
and acting on it is one click apart.

Underneath it, the thing I would want reviewed most closely is that a status change is atomic
and broadcast only after it commits. The booking row, its audit event and the mechanic's
availability all move together or not at all, which means the timeline on a booking can never
contradict its status, and no client can ever receive an event describing a state the database
never reached.
