import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, sql } from '../../db';
import { customers, vehicles } from '../../db/schema';
import { ApiError } from '../../lib/api-error';

export const listCustomersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
  city: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'totalSpend', 'bookings']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuery>;

const SORT_SQL: Record<ListCustomersQuery['sortBy'], string> = {
  createdAt: 'c.created_at',
  name: 'c.name',
  totalSpend: '"totalSpend"',
  bookings: '"totalBookings"',
};

export async function listCustomers(query: ListCustomersQuery) {
  const search = query.search ? `%${query.search}%` : null;
  const city = query.city ?? null;

  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      c.id, c.name, c.email, c.phone, c.city, c.address, c.created_at AS "createdAt",
      count(b.id)::int AS "totalBookings",
      coalesce(sum(b.amount) FILTER (WHERE b.status = 'COMPLETED'), 0)::float AS "totalSpend",
      max(b.created_at) AS "lastBookingAt",
      count(DISTINCT v.id)::int AS "vehicleCount",
      count(*) OVER()::int AS "totalCount"
    FROM customers c
    LEFT JOIN bookings b ON b.customer_id = c.id
    LEFT JOIN vehicles v ON v.customer_id = c.id
    WHERE (${search}::text IS NULL
            OR c.name ILIKE ${search} OR c.email ILIKE ${search} OR c.phone ILIKE ${search})
      AND (${city}::text IS NULL OR c.city = ${city})
    GROUP BY c.id
    ORDER BY ${sql.unsafe(SORT_SQL[query.sortBy])} ${sql.unsafe(query.sortOrder === 'asc' ? 'ASC' : 'DESC')}
    LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
  `;

  return {
    items: rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      email: String(r.email),
      phone: String(r.phone),
      city: String(r.city),
      address: String(r.address),
      createdAt: r.createdAt,
      totalBookings: Number(r.totalBookings),
      totalSpend: Number(Number(r.totalSpend).toFixed(2)),
      lastBookingAt: r.lastBookingAt,
      vehicleCount: Number(r.vehicleCount),
    })),
    total: rows.length ? Number(rows[0].totalCount) : 0,
  };
}

export async function getCustomerById(id: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) throw ApiError.notFound(`No customer with id ${id}`);

  const garage = await db.select().from(vehicles).where(eq(vehicles.customerId, id));

  const [stats] = await sql<Array<Record<string, unknown>>>`
    SELECT count(*)::int AS "totalBookings",
           coalesce(sum(amount) FILTER (WHERE status = 'COMPLETED'), 0)::float AS "totalSpend"
    FROM bookings WHERE customer_id = ${id}
  `;

  return {
    ...customer,
    vehicles: garage,
    stats: {
      totalBookings: Number(stats?.totalBookings ?? 0),
      totalSpend: Number(Number(stats?.totalSpend ?? 0).toFixed(2)),
    },
  };
}
