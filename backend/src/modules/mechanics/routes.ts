import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler';
import { buildMeta, ok } from '../../lib/http';
import { requireAuth, requireRole } from '../../middleware/auth';
import { emitMechanicUpdated } from '../../realtime/events';
import * as mechanicsService from './service';

export const mechanicsRouter = Router();

mechanicsRouter.use(requireAuth);

mechanicsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = mechanicsService.listMechanicsQuery.parse(req.query);
    const { items, total } = await mechanicsService.listMechanics(query);
    ok(res, items, buildMeta(query.page, query.limit, total));
  }),
);

mechanicsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = z.string().uuid('Mechanic id must be a uuid').parse(req.params.id);
    ok(res, await mechanicsService.getMechanicById(id));
  }),
);

mechanicsRouter.patch(
  '/:id/status',
  requireRole('ADMIN', 'OPS'),
  asyncHandler(async (req, res) => {
    const id = z.string().uuid('Mechanic id must be a uuid').parse(req.params.id);
    const { status } = mechanicsService.updateMechanicBody.parse(req.body);
    const mechanic = await mechanicsService.updateMechanicStatus(id, status);
    emitMechanicUpdated(mechanic);
    ok(res, mechanic);
  }),
);
