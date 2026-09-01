import { and, eq, inArray, sql as raw } from 'drizzle-orm';
import { db, sql } from '../db';
import { bookingEvents, bookings, mechanics, services } from '../db/schema';
import type { BookingStatus } from '../db/schema';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { ACTIVE_STATUSES, nextStatus } from '../lib/booking-status';
import { getBookingById } from '../modules/bookings/service';
import { getSummary } from '../modules/dashboard/service';
import { emitBookingCreated, emitBookingUpdated, emitMechanicUpdated, emitStats } from './events';

/**
 * A real dispatch centre has jobs moving all day. Nothing else in this project
 * writes to the database on its own, so this simulator plays the role of the
 * mobile apps used by mechanics and customers: it advances jobs through the
 * flow, occasionally books a new one, and pushes every change over the socket.
 *
 * Set SIMULATOR_ENABLED=false to run the API as a plain read-only service.
 */

let timer: NodeJS.Timeout | null = null;
let tick = 0;

async function advanceOneBooking() {
  const candidates = await db
    .select({ id: bookings.id, status: bookings.status, mechanicId: bookings.mechanicId })
    .from(bookings)
    .where(inArray(bookings.status, ACTIVE_STATUSES))
    .orderBy(raw`random()`)
    .limit(1);

  const candidate = candidates[0];
  if (!candidate) return;

  // Roughly one in twenty live jobs falls over; the ops team needs to see that.
  const shouldCancel = Math.random() < 0.05 && candidate.status !== 'IN_PROGRESS';
  const target: BookingStatus | null = shouldCancel ? 'CANCELLED' : nextStatus(candidate.status);
  if (!target) return;

  let mechanicId = candidate.mechanicId;
  if (target === 'ASSIGNED' && !mechanicId) {
    const [free] = await db
      .select({ id: mechanics.id })
      .from(mechanics)
      .where(eq(mechanics.status, 'AVAILABLE'))
      .orderBy(raw`random()`)
      .limit(1);
    if (!free) return; // no one to dispatch to; try again next tick
    mechanicId = free.id;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({
        status: target,
        mechanicId: mechanicId ?? null,
        completedAt: target === 'COMPLETED' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, candidate.id));

    await tx.insert(bookingEvents).values({
      bookingId: candidate.id,
      fromStatus: candidate.status,
      toStatus: target,
      actor: 'dispatch-bot',
      note: target === 'CANCELLED' ? 'Customer cancelled before the visit' : '',
    });

    if (mechanicId) {
      if (target === 'COMPLETED') {
        await tx
          .update(mechanics)
          .set({ status: 'AVAILABLE', jobsCompleted: raw`${mechanics.jobsCompleted} + 1` })
          .where(eq(mechanics.id, mechanicId));
      } else if (target === 'CANCELLED') {
        await tx.update(mechanics).set({ status: 'AVAILABLE' }).where(eq(mechanics.id, mechanicId));
      } else {
        await tx.update(mechanics).set({ status: 'ON_JOB' }).where(eq(mechanics.id, mechanicId));
      }
    }
  });

  const booking = await getBookingById(candidate.id);
  emitBookingUpdated(booking, { actor: 'dispatch-bot' });

  if (mechanicId) {
    const [mechanic] = await db.select().from(mechanics).where(eq(mechanics.id, mechanicId)).limit(1);
    if (mechanic) emitMechanicUpdated(mechanic);
  }
}

async function createBooking() {
  const [row] = await sql<Array<Record<string, unknown>>>`
    SELECT v.id AS vehicle_id, v.customer_id, c.city, c.address
    FROM vehicles v JOIN customers c ON c.id = v.customer_id
    ORDER BY random() LIMIT 1
  `;
  if (!row) return;

  const [service] = await db.select().from(services).orderBy(raw`random()`).limit(1);
  if (!service) return;

  const [{ nextRef }] = await sql<Array<{ nextRef: string }>>`
    SELECT lpad((coalesce(max(substring(reference from 4)::int), 10000) + 1)::text, 5, '0') AS "nextRef"
    FROM bookings
  `;

  const variance = 0.85 + Math.random() * 0.4;
  const amount = (Number(service.basePrice) * variance).toFixed(2);
  const scheduledAt = new Date(Date.now() + (30 + Math.floor(Math.random() * 300)) * 60_000);

  const [created] = await db
    .insert(bookings)
    .values({
      reference: `IM-${nextRef}`,
      customerId: String(row.customer_id),
      vehicleId: String(row.vehicle_id),
      serviceId: service.id,
      status: 'PENDING',
      amount,
      city: String(row.city),
      address: String(row.address),
      latitude: 0,
      longitude: 0,
      notes: 'Booked from the customer app',
      scheduledAt,
    })
    .returning({ id: bookings.id });

  if (!created) return;

  // Give the new booking a real position near its city centre.
  const [{ latitude, longitude }] = await sql<Array<{ latitude: number; longitude: number }>>`
    SELECT avg(latitude)::float AS latitude, avg(longitude)::float AS longitude
    FROM mechanics WHERE city = ${String(row.city)}
  `;
  await db
    .update(bookings)
    .set({
      latitude: (latitude ?? 12.97) + (Math.random() - 0.5) * 0.08,
      longitude: (longitude ?? 77.59) + (Math.random() - 0.5) * 0.08,
    })
    .where(eq(bookings.id, created.id));

  await db.insert(bookingEvents).values({
    bookingId: created.id,
    fromStatus: null,
    toStatus: 'PENDING',
    actor: 'customer-app',
    note: 'Booking received',
  });

  emitBookingCreated(await getBookingById(created.id));
}

async function toggleMechanicShift() {
  const [mechanic] = await db
    .select()
    .from(mechanics)
    .where(and(eq(mechanics.status, 'AVAILABLE')))
    .orderBy(raw`random()`)
    .limit(1);
  if (!mechanic) return;
  const [updated] = await db
    .update(mechanics)
    .set({ status: 'OFF_DUTY' })
    .where(eq(mechanics.id, mechanic.id))
    .returning();
  if (updated) emitMechanicUpdated(updated);
}

async function runTick() {
  try {
    const roll = Math.random();
    if (roll < 0.7) await advanceOneBooking();
    else if (roll < 0.92) await createBooking();
    else await toggleMechanicShift();

    tick += 1;
    // Refreshing the KPI row every tick would be wasteful; every fifth is plenty.
    if (tick % 5 === 0) {
      emitStats(await getSummary({ timezone: 'Asia/Kolkata', days: 30 }));
    }
  } catch (error) {
    logger.error('Simulator tick failed', error instanceof Error ? error.message : error);
  }
}

export function startSimulator() {
  if (!env.SIMULATOR_ENABLED) {
    logger.info('Live simulator disabled (SIMULATOR_ENABLED=false)');
    return;
  }
  if (timer) return;
  timer = setInterval(runTick, env.SIMULATOR_INTERVAL_MS);
  logger.info(`Live simulator running every ${env.SIMULATOR_INTERVAL_MS}ms`);
}

export function stopSimulator() {
  if (timer) clearInterval(timer);
  timer = null;
}
