import { sql } from '../../db';

export interface DashboardOptions {
  /** IANA timezone used to decide what "today" means for the ops team. */
  timezone: string;
  /** Size of the trend window in days. */
  days: number;
}

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

/**
 * Head-line numbers plus a comparison against the immediately preceding window,
 * so every KPI can show a trend instead of a bare number.
 */
export async function getSummary({ timezone, days }: DashboardOptions) {
  const [row] = await sql<
    Array<Record<string, unknown>>
  >`
    WITH bounds AS (
      SELECT
        (now() AT TIME ZONE ${timezone})::date                             AS today,
        (now() - (${days} || ' days')::interval)                           AS window_start,
        (now() - (${days * 2} || ' days')::interval)                       AS prev_start
    )
    SELECT
      (SELECT count(*)::int FROM bookings)                                                    AS "totalBookings",
      (SELECT count(*)::int FROM bookings, bounds
         WHERE (scheduled_at AT TIME ZONE ${timezone})::date = bounds.today)                  AS "todayBookings",
      (SELECT count(*)::int FROM bookings WHERE status = 'COMPLETED')                         AS "completedBookings",
      (SELECT count(*)::int FROM bookings WHERE status = 'PENDING')                           AS "pendingBookings",
      (SELECT count(*)::int FROM bookings WHERE status = 'CANCELLED')                         AS "cancelledBookings",
      (SELECT count(*)::int FROM bookings
         WHERE status IN ('ASSIGNED','ON_THE_WAY','IN_PROGRESS'))                             AS "inFlightBookings",
      (SELECT coalesce(sum(amount), 0)::float FROM bookings WHERE status = 'COMPLETED')       AS "totalRevenue",
      (SELECT coalesce(sum(amount), 0)::float FROM bookings, bounds
         WHERE status = 'COMPLETED'
           AND (completed_at AT TIME ZONE ${timezone})::date = bounds.today)                  AS "todayRevenue",
      (SELECT count(*)::int FROM mechanics WHERE status <> 'OFF_DUTY')                        AS "activeMechanics",
      (SELECT count(*)::int FROM mechanics)                                                   AS "totalMechanics",
      (SELECT count(*)::int FROM customers, bounds
         WHERE created_at >= bounds.window_start)                                             AS "newCustomers",
      (SELECT count(*)::int FROM customers)                                                   AS "totalCustomers",
      (SELECT coalesce(avg(amount), 0)::float FROM bookings WHERE status = 'COMPLETED')       AS "averageTicket",
      (SELECT count(*)::int FROM bookings, bounds WHERE created_at >= bounds.window_start)    AS "bookingsThisWindow",
      (SELECT count(*)::int FROM bookings, bounds
         WHERE created_at >= bounds.prev_start AND created_at < bounds.window_start)          AS "bookingsPrevWindow",
      (SELECT coalesce(sum(amount), 0)::float FROM bookings, bounds
         WHERE status = 'COMPLETED' AND completed_at >= bounds.window_start)                  AS "revenueThisWindow",
      (SELECT coalesce(sum(amount), 0)::float FROM bookings, bounds
         WHERE status = 'COMPLETED'
           AND completed_at >= bounds.prev_start AND completed_at < bounds.window_start)      AS "revenuePrevWindow",
      (SELECT count(*)::int FROM customers, bounds
         WHERE created_at >= bounds.prev_start AND created_at < bounds.window_start)          AS "customersPrevWindow"
  `;

  const data = row ?? {};
  const totalBookings = num(data.totalBookings);
  const completed = num(data.completedBookings);
  const cancelled = num(data.cancelledBookings);

  const delta = (current: number, previous: number) =>
    previous === 0 ? (current === 0 ? 0 : 100) : Number((((current - previous) / previous) * 100).toFixed(1));

  return {
    totalBookings,
    todayBookings: num(data.todayBookings),
    completedBookings: completed,
    pendingBookings: num(data.pendingBookings),
    cancelledBookings: cancelled,
    inFlightBookings: num(data.inFlightBookings),
    totalRevenue: Number(num(data.totalRevenue).toFixed(2)),
    todayRevenue: Number(num(data.todayRevenue).toFixed(2)),
    activeMechanics: num(data.activeMechanics),
    totalMechanics: num(data.totalMechanics),
    newCustomers: num(data.newCustomers),
    totalCustomers: num(data.totalCustomers),
    averageTicket: Number(num(data.averageTicket).toFixed(2)),
    completionRate: totalBookings ? Number(((completed / totalBookings) * 100).toFixed(1)) : 0,
    cancellationRate: totalBookings ? Number(((cancelled / totalBookings) * 100).toFixed(1)) : 0,
    trends: {
      bookings: delta(num(data.bookingsThisWindow), num(data.bookingsPrevWindow)),
      revenue: delta(num(data.revenueThisWindow), num(data.revenuePrevWindow)),
      customers: delta(num(data.newCustomers), num(data.customersPrevWindow)),
    },
    window: { days, timezone },
  };
}

/** Bookings and revenue per day, with empty days filled in so charts never gap. */
export async function getTimeseries({ timezone, days }: DashboardOptions) {
  const rows = await sql<Array<Record<string, unknown>>>`
    WITH days AS (
      SELECT generate_series(
        (now() AT TIME ZONE ${timezone})::date - (${days - 1} || ' days')::interval,
        (now() AT TIME ZONE ${timezone})::date,
        '1 day'
      )::date AS day
    )
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS "date",
      coalesce(b.bookings, 0)::int AS "bookings",
      coalesce(b.completed, 0)::int AS "completed",
      coalesce(b.cancelled, 0)::int AS "cancelled",
      coalesce(r.revenue, 0)::float AS "revenue"
    FROM days d
    LEFT JOIN (
      SELECT (created_at AT TIME ZONE ${timezone})::date AS day,
             count(*) AS bookings,
             count(*) FILTER (WHERE status = 'COMPLETED') AS completed,
             count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled
      FROM bookings GROUP BY 1
    ) b ON b.day = d.day
    LEFT JOIN (
      SELECT (completed_at AT TIME ZONE ${timezone})::date AS day, sum(amount) AS revenue
      FROM bookings WHERE status = 'COMPLETED' AND completed_at IS NOT NULL GROUP BY 1
    ) r ON r.day = d.day
    ORDER BY d.day
  `;

  return rows.map((r) => ({
    date: String(r.date),
    bookings: num(r.bookings),
    completed: num(r.completed),
    cancelled: num(r.cancelled),
    revenue: Number(num(r.revenue).toFixed(2)),
  }));
}

export async function getStatusBreakdown() {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT status AS "status", count(*)::int AS "count", coalesce(sum(amount), 0)::float AS "value"
    FROM bookings
    GROUP BY status
    ORDER BY count(*) DESC
  `;
  return rows.map((r) => ({
    status: String(r.status),
    count: num(r.count),
    value: Number(num(r.value).toFixed(2)),
  }));
}

export async function getServiceBreakdown() {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      s.category                                              AS "category",
      count(b.id)::int                                        AS "bookings",
      coalesce(sum(b.amount) FILTER (WHERE b.status = 'COMPLETED'), 0)::float AS "revenue",
      coalesce(avg(b.amount), 0)::float                       AS "averageTicket"
    FROM services s
    LEFT JOIN bookings b ON b.service_id = s.id
    GROUP BY s.category
    ORDER BY count(b.id) DESC
  `;
  return rows.map((r) => ({
    category: String(r.category),
    bookings: num(r.bookings),
    revenue: Number(num(r.revenue).toFixed(2)),
    averageTicket: Number(num(r.averageTicket).toFixed(2)),
  }));
}

/** Fed straight into the "live activity" rail on the overview page. */
export async function getRecentActivity(limit = 12) {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      e.id                AS "id",
      e.from_status       AS "fromStatus",
      e.to_status         AS "toStatus",
      e.created_at        AS "createdAt",
      e.actor             AS "actor",
      b.id                AS "bookingId",
      b.reference         AS "reference",
      c.name              AS "customerName",
      m.name              AS "mechanicName"
    FROM booking_events e
    JOIN bookings b ON b.id = e.booking_id
    JOIN customers c ON c.id = b.customer_id
    LEFT JOIN mechanics m ON m.id = b.mechanic_id
    ORDER BY e.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: String(r.id),
    bookingId: String(r.bookingId),
    reference: String(r.reference),
    customerName: String(r.customerName),
    mechanicName: r.mechanicName ? String(r.mechanicName) : null,
    fromStatus: r.fromStatus ? String(r.fromStatus) : null,
    toStatus: String(r.toStatus),
    actor: String(r.actor),
    createdAt: r.createdAt,
  }));
}

export async function getTopMechanics(limit = 5) {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      m.id                                                    AS "id",
      m.name                                                  AS "name",
      m.status                                                AS "status",
      m.rating                                                AS "rating",
      m.jobs_completed::int                                   AS "jobsCompleted",
      coalesce(sum(b.amount) FILTER (WHERE b.status = 'COMPLETED'), 0)::float AS "revenue"
    FROM mechanics m
    LEFT JOIN bookings b ON b.mechanic_id = m.id
    GROUP BY m.id
    ORDER BY "revenue" DESC, m.jobs_completed DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    status: String(r.status),
    rating: num(r.rating),
    jobsCompleted: num(r.jobsCompleted),
    revenue: Number(num(r.revenue).toFixed(2)),
  }));
}

export async function getCityBreakdown(limit = 6) {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT city AS "city", count(*)::int AS "bookings",
           coalesce(sum(amount) FILTER (WHERE status = 'COMPLETED'), 0)::float AS "revenue"
    FROM bookings GROUP BY city ORDER BY count(*) DESC LIMIT ${limit}
  `;
  return rows.map((r) => ({
    city: String(r.city),
    bookings: num(r.bookings),
    revenue: Number(num(r.revenue).toFixed(2)),
  }));
}

/**
 * One round trip for the whole overview page. The queries are independent so
 * they run concurrently rather than one after another.
 */
export async function getDashboard(options: DashboardOptions) {
  const [summary, timeseries, statusBreakdown, serviceBreakdown, recentActivity, topMechanics, cities] =
    await Promise.all([
      getSummary(options),
      getTimeseries(options),
      getStatusBreakdown(),
      getServiceBreakdown(),
      getRecentActivity(),
      getTopMechanics(),
      getCityBreakdown(),
    ]);

  return {
    summary,
    timeseries,
    statusBreakdown,
    serviceBreakdown,
    recentActivity,
    topMechanics,
    cities,
    generatedAt: new Date().toISOString(),
  };
}
