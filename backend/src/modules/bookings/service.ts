import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql as raw,
  type SQL,
} from 'drizzle-orm';
import { z } from 'zod';
import { db, sql } from '../../db';
import { bookingEvents, bookings, customers, mechanics, services, vehicles } from '../../db/schema';
import type { BookingStatus } from '../../db/schema';
import { ApiError } from '../../lib/api-error';
import { ACTIVE_STATUSES, canTransition } from '../../lib/booking-status';

const statusValues = [
  'PENDING',
  'ASSIGNED',
  'ON_THE_WAY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

const csv = (transform: (v: string) => string = (v) => v) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => transform(s.trim())).filter(Boolean) : undefined));

export const listBookingsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
  status: csv((v) => v.toUpperCase()).pipe(z.array(z.enum(statusValues)).optional()),
  serviceId: z.string().uuid().optional(),
  mechanicId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  sortBy: z.enum(['createdAt', 'scheduledAt', 'amount', 'status', 'reference']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListBookingsQuery = z.infer<typeof listBookingsQuery>;

const SORT_COLUMNS = {
  createdAt: bookings.createdAt,
  scheduledAt: bookings.scheduledAt,
  amount: bookings.amount,
  status: bookings.status,
  reference: bookings.reference,
} as const;

function buildFilters(q: ListBookingsQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (q.search) {
    const term = `%${q.search}%`;
    filters.push(
      or(
        ilike(bookings.reference, term),
        ilike(customers.name, term),
        ilike(customers.phone, term),
        ilike(vehicles.registration, term),
        ilike(services.name, term),
        ilike(mechanics.name, term),
      ),
    );
  }
  if (q.status?.length) filters.push(inArray(bookings.status, q.status));
  if (q.serviceId) filters.push(eq(bookings.serviceId, q.serviceId));
  if (q.mechanicId) filters.push(eq(bookings.mechanicId, q.mechanicId));
  if (q.customerId) filters.push(eq(bookings.customerId, q.customerId));
  if (q.city) filters.push(eq(bookings.city, q.city));
  if (q.category) filters.push(eq(services.category, q.category as never));
  if (q.dateFrom) filters.push(gte(bookings.createdAt, q.dateFrom));
  if (q.dateTo) filters.push(lte(bookings.createdAt, q.dateTo));
  if (q.minAmount !== undefined) filters.push(gte(bookings.amount, String(q.minAmount)));
  if (q.maxAmount !== undefined) filters.push(lte(bookings.amount, String(q.maxAmount)));

  const defined = filters.filter(Boolean) as SQL[];
  return defined.length ? and(...defined) : undefined;
}

const listSelection = {
  id: bookings.id,
  reference: bookings.reference,
  status: bookings.status,
  amount: bookings.amount,
  city: bookings.city,
  address: bookings.address,
  notes: bookings.notes,
  scheduledAt: bookings.scheduledAt,
  completedAt: bookings.completedAt,
  createdAt: bookings.createdAt,
  updatedAt: bookings.updatedAt,
  customerId: customers.id,
  customerName: customers.name,
  customerPhone: customers.phone,
  customerEmail: customers.email,
  vehicleMake: vehicles.make,
  vehicleModel: vehicles.model,
  vehicleYear: vehicles.year,
  vehicleRegistration: vehicles.registration,
  vehicleType: vehicles.type,
  serviceId: services.id,
  serviceName: services.name,
  serviceCategory: services.category,
  serviceDuration: services.durationMinutes,
  mechanicId: mechanics.id,
  mechanicName: mechanics.name,
  mechanicStatus: mechanics.status,
  mechanicPhone: mechanics.phone,
} as const;

type ListRow = { [K in keyof typeof listSelection]: unknown };

/** Flat SQL row -> the nested shape the dashboard renders. */
function shape(row: ListRow) {
  return {
    id: String(row.id),
    reference: String(row.reference),
    status: row.status as BookingStatus,
    amount: Number(row.amount),
    city: String(row.city),
    address: String(row.address),
    notes: String(row.notes ?? ''),
    scheduledAt: row.scheduledAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: {
      id: String(row.customerId),
      name: String(row.customerName),
      phone: String(row.customerPhone),
      email: String(row.customerEmail),
    },
    vehicle: {
      make: String(row.vehicleMake),
      model: String(row.vehicleModel),
      year: Number(row.vehicleYear),
      registration: String(row.vehicleRegistration),
      type: String(row.vehicleType),
    },
    service: {
      id: String(row.serviceId),
      name: String(row.serviceName),
      category: String(row.serviceCategory),
      durationMinutes: Number(row.serviceDuration),
    },
    mechanic: row.mechanicId
      ? {
          id: String(row.mechanicId),
          name: String(row.mechanicName),
          status: String(row.mechanicStatus),
          phone: String(row.mechanicPhone),
        }
      : null,
  };
}

export type BookingListItem = ReturnType<typeof shape>;

export async function listBookings(query: ListBookingsQuery) {
  const where = buildFilters(query);
  const orderColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

  const rowsPromise = db
    .select(listSelection)
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(mechanics, eq(bookings.mechanicId, mechanics.id))
    .where(where)
    .orderBy(orderBy, desc(bookings.id))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const totalPromise = db
    .select({ value: count() })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(mechanics, eq(bookings.mechanicId, mechanics.id))
    .where(where);

  const [rows, totalRows] = await Promise.all([rowsPromise, totalPromise]);

  return { items: rows.map(shape), total: Number(totalRows[0]?.value ?? 0) };
}

export async function getBookingById(id: string) {
  const [row] = await db
    .select(listSelection)
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(mechanics, eq(bookings.mechanicId, mechanics.id))
    .where(eq(bookings.id, id))
    .limit(1);

  if (!row) throw ApiError.notFound(`No booking with id ${id}`);

  const timeline = await db
    .select()
    .from(bookingEvents)
    .where(eq(bookingEvents.bookingId, id))
    .orderBy(asc(bookingEvents.createdAt));

  return { ...shape(row), timeline };
}

export const updateStatusBody = z.object({
  status: z.enum(statusValues),
  mechanicId: z.string().uuid().nullish(),
  note: z.string().max(280).optional(),
});

/**
 * Moves a booking along the dispatch flow. Rejects illegal jumps, keeps the
 * mechanic's availability in sync and writes an audit event - all inside one
 * transaction so the timeline can never disagree with the booking row.
 */
export async function updateBookingStatus(
  id: string,
  input: z.infer<typeof updateStatusBody>,
  actor = 'system',
) {
  const [current] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!current) throw ApiError.notFound(`No booking with id ${id}`);

  if (current.status === input.status) {
    throw ApiError.conflict(`Booking is already ${input.status}`);
  }
  if (!canTransition(current.status, input.status)) {
    throw ApiError.conflict(
      `A booking cannot move from ${current.status} to ${input.status}`,
      { from: current.status, to: input.status },
    );
  }
  if (input.status === 'ASSIGNED' && !input.mechanicId && !current.mechanicId) {
    throw ApiError.badRequest('Assigning a booking needs a mechanic');
  }

  const mechanicId = input.mechanicId ?? current.mechanicId;

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({
        status: input.status,
        mechanicId: mechanicId ?? null,
        completedAt: input.status === 'COMPLETED' ? new Date() : current.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id));

    await tx.insert(bookingEvents).values({
      bookingId: id,
      fromStatus: current.status,
      toStatus: input.status,
      note: input.note ?? '',
      actor,
    });

    if (mechanicId) {
      if (input.status === 'COMPLETED') {
        await tx
          .update(mechanics)
          .set({ status: 'AVAILABLE', jobsCompleted: raw`${mechanics.jobsCompleted} + 1` })
          .where(eq(mechanics.id, mechanicId));
      } else if (input.status === 'CANCELLED') {
        await tx.update(mechanics).set({ status: 'AVAILABLE' }).where(eq(mechanics.id, mechanicId));
      } else if (ACTIVE_STATUSES.includes(input.status)) {
        await tx.update(mechanics).set({ status: 'ON_JOB' }).where(eq(mechanics.id, mechanicId));
      }
    }
  });

  return getBookingById(id);
}

const CSV_HEADERS = [
  'Booking ID',
  'Customer',
  'Phone',
  'Vehicle',
  'Registration',
  'Service',
  'Category',
  'Mechanic',
  'Status',
  'Amount',
  'City',
  'Scheduled at',
  'Created at',
];

const escape = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export async function exportBookingsCsv(query: ListBookingsQuery) {
  // Export ignores pagination but stays bounded so one request cannot stall the API.
  const { items } = await listBookings({ ...query, page: 1, limit: 5000 });
  const lines = [CSV_HEADERS.join(',')];
  for (const b of items) {
    lines.push(
      [
        b.reference,
        b.customer.name,
        b.customer.phone,
        `${b.vehicle.make} ${b.vehicle.model}`,
        b.vehicle.registration,
        b.service.name,
        b.service.category,
        b.mechanic?.name ?? 'Unassigned',
        b.status,
        b.amount,
        b.city,
        (b.scheduledAt as Date)?.toISOString?.() ?? '',
        (b.createdAt as Date)?.toISOString?.() ?? '',
      ]
        .map(escape)
        .join(','),
    );
  }
  return lines.join('\n');
}

/** Distinct values used to populate the filter dropdowns. */
export async function getBookingFilters() {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT DISTINCT city FROM bookings ORDER BY city
  `;
  return { cities: rows.map((r) => String(r.city)) };
}
