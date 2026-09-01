import { getIo } from './io';

export const REALTIME_EVENTS = {
  bookingCreated: 'booking:created',
  bookingUpdated: 'booking:updated',
  mechanicUpdated: 'mechanic:updated',
  statsUpdated: 'dashboard:stats',
} as const;

interface BookingLike {
  id: string;
  reference: string;
  status: string;
}

export function emitBookingCreated(booking: unknown) {
  getIo()?.to('ops').emit(REALTIME_EVENTS.bookingCreated, {
    booking,
    at: new Date().toISOString(),
  });
}

export function emitBookingUpdated(booking: unknown, extra: Record<string, unknown> = {}) {
  const payload = { booking, at: new Date().toISOString(), ...extra };
  const io = getIo();
  if (!io) return;
  io.to('ops').emit(REALTIME_EVENTS.bookingUpdated, payload);
  const id = (booking as BookingLike | null)?.id;
  if (id) io.to(`booking:${id}`).emit(REALTIME_EVENTS.bookingUpdated, payload);
}

export function emitMechanicUpdated(mechanic: unknown) {
  getIo()?.to('ops').emit(REALTIME_EVENTS.mechanicUpdated, {
    mechanic,
    at: new Date().toISOString(),
  });
}

export function emitStats(summary: unknown) {
  getIo()?.to('ops').emit(REALTIME_EVENTS.statsUpdated, {
    summary,
    at: new Date().toISOString(),
  });
}
