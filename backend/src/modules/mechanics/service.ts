import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db, sql } from '../../db';
import { bookings, customers, mechanics, services } from '../../db/schema';
import { ApiError } from '../../lib/api-error';

const statuses = ['AVAILABLE', 'ON_JOB', 'OFF_DUTY'] as const;

export const listMechanicsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().trim().max(120).optional(),
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim().toUpperCase()) : undefined))
    .pipe(z.array(z.enum(statuses)).optional()),
  city: z.string().optional(),
  sortBy: z.enum(['jobsCompleted', 'rating', 'name', 'status']).default('jobsCompleted'),
});

export type ListMechanicsQuery = z.infer<typeof listMechanicsQuery>;

/** Only these expressions can ever reach ORDER BY. */
const SORT_SQL: Record<ListMechanicsQuery['sortBy'], string> = {
  jobsCompleted: 'm.jobs_completed DESC',
  rating: 'm.rating DESC',
  name: 'm.name ASC',
  status: "(m.status = 'ON_JOB') DESC, m.name ASC",
};

/**
 * Every mechanic row carries the job they are on right now (or the last one
 * they closed). A LATERAL join keeps that to a single round trip instead of
 * one extra query per mechanic.
 */
export async function listMechanics(query: ListMechanicsQuery) {
  const search = query.search ? `%${query.search}%` : null;
  const status = query.status?.length ? query.status : null;
  const city = query.city ?? null;

  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      m.id, m.name, m.email, m.phone, m.status, m.specialisation, m.rating,
      m.jobs_completed AS "jobsCompleted", m.city, m.latitude, m.longitude,
      m.joined_at AS "joinedAt",
      j.booking_id AS "bookingId", j.reference AS "bookingReference",
      j.booking_status AS "bookingStatus", j.customer_name AS "bookingCustomer",
      j.service_name AS "bookingService", j.scheduled_at AS "bookingScheduledAt",
      coalesce(rev.revenue, 0)::float AS "revenue",
      count(*) OVER()::int AS "totalCount"
    FROM mechanics m
    LEFT JOIN LATERAL (
      SELECT b.id AS booking_id, b.reference, b.status AS booking_status, b.scheduled_at,
             c.name AS customer_name, s.name AS service_name
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      JOIN services s ON s.id = b.service_id
      WHERE b.mechanic_id = m.id
      ORDER BY (b.status IN ('ASSIGNED','ON_THE_WAY','IN_PROGRESS')) DESC, b.updated_at DESC
      LIMIT 1
    ) j ON TRUE
    LEFT JOIN LATERAL (
      SELECT sum(b.amount) AS revenue
      FROM bookings b
      WHERE b.mechanic_id = m.id AND b.status = 'COMPLETED'
    ) rev ON TRUE
    WHERE (${search}::text IS NULL
            OR m.name ILIKE ${search} OR m.email ILIKE ${search} OR m.phone ILIKE ${search})
      AND (${status}::text[] IS NULL OR m.status::text = ANY(${status}))
      AND (${city}::text IS NULL OR m.city = ${city})
    ORDER BY ${sql.unsafe(SORT_SQL[query.sortBy])}
    LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
  `;

  return {
    items: rows.map(shapeMechanic),
    total: rows.length ? Number(rows[0].totalCount) : 0,
  };
}

function shapeMechanic(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    phone: String(r.phone),
    status: String(r.status),
    specialisation: String(r.specialisation),
    rating: Number(r.rating),
    jobsCompleted: Number(r.jobsCompleted),
    city: String(r.city),
    location: { latitude: Number(r.latitude), longitude: Number(r.longitude) },
    joinedAt: r.joinedAt,
    revenue: Number(Number(r.revenue ?? 0).toFixed(2)),
    currentBooking: r.bookingId
      ? {
          id: String(r.bookingId),
          reference: String(r.bookingReference),
          status: String(r.bookingStatus),
          customer: String(r.bookingCustomer),
          service: String(r.bookingService),
          scheduledAt: r.bookingScheduledAt,
        }
      : null,
  };
}

export async function getMechanicById(id: string) {
  const [mechanic] = await db.select().from(mechanics).where(eq(mechanics.id, id)).limit(1);
  if (!mechanic) throw ApiError.notFound(`No mechanic with id ${id}`);

  const recent = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      status: bookings.status,
      amount: bookings.amount,
      scheduledAt: bookings.scheduledAt,
      completedAt: bookings.completedAt,
      customerName: customers.name,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.mechanicId, id))
    .orderBy(desc(bookings.updatedAt))
    .limit(10);

  const [stats] = await sql<Array<Record<string, unknown>>>`
    SELECT
      count(*)::int AS "totalJobs",
      count(*) FILTER (WHERE status = 'COMPLETED')::int AS "completedJobs",
      count(*) FILTER (WHERE status = 'CANCELLED')::int AS "cancelledJobs",
      coalesce(sum(amount) FILTER (WHERE status = 'COMPLETED'), 0)::float AS "revenue",
      coalesce(avg(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
        FILTER (WHERE status = 'COMPLETED'), 0)::float AS "avgTurnaroundHours"
    FROM bookings WHERE mechanic_id = ${id}
  `;

  return {
    ...mechanic,
    stats: {
      totalJobs: Number(stats?.totalJobs ?? 0),
      completedJobs: Number(stats?.completedJobs ?? 0),
      cancelledJobs: Number(stats?.cancelledJobs ?? 0),
      revenue: Number(Number(stats?.revenue ?? 0).toFixed(2)),
      avgTurnaroundHours: Number(Number(stats?.avgTurnaroundHours ?? 0).toFixed(1)),
    },
    recentBookings: recent.map((b) => ({ ...b, amount: Number(b.amount) })),
  };
}

export const updateMechanicBody = z.object({ status: z.enum(statuses) });

export async function updateMechanicStatus(id: string, status: (typeof statuses)[number]) {
  const [updated] = await db.update(mechanics).set({ status }).where(eq(mechanics.id, id)).returning();
  if (!updated) throw ApiError.notFound(`No mechanic with id ${id}`);
  return updated;
}
