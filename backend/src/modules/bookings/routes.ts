import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler';
import { buildMeta, ok } from '../../lib/http';
import { requireAuth, requireRole } from '../../middleware/auth';
import { emitBookingUpdated } from '../../realtime/events';
import * as bookingsService from './service';

export const bookingsRouter = Router();

bookingsRouter.use(requireAuth);

bookingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = bookingsService.listBookingsQuery.parse(req.query);
    const { items, total } = await bookingsService.listBookings(query);
    ok(res, items, buildMeta(query.page, query.limit, total));
  }),
);

/** Registered before "/:id" so the literal path is not swallowed by the param. */
bookingsRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const query = bookingsService.listBookingsQuery.parse(req.query);
    const csv = await bookingsService.exportBookingsCsv(query);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bookings-${stamp}.csv"`);
    res.send(csv);
  }),
);

bookingsRouter.get(
  '/filters',
  asyncHandler(async (_req, res) => {
    ok(res, await bookingsService.getBookingFilters());
  }),
);

bookingsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = z.string().uuid('Booking id must be a uuid').parse(req.params.id);
    ok(res, await bookingsService.getBookingById(id));
  }),
);

bookingsRouter.patch(
  '/:id/status',
  requireRole('ADMIN', 'OPS'),
  asyncHandler(async (req, res) => {
    const id = z.string().uuid('Booking id must be a uuid').parse(req.params.id);
    const body = bookingsService.updateStatusBody.parse(req.body);
    const booking = await bookingsService.updateBookingStatus(id, body, req.user?.name ?? 'operator');
    emitBookingUpdated(booking, { actor: req.user?.name ?? 'operator' });
    ok(res, booking);
  }),
);
