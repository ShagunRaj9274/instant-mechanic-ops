import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { ok } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { listServices } from './service';

export const servicesRouter = Router();

servicesRouter.use(requireAuth);

servicesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await listServices());
  }),
);
