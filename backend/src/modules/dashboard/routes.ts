import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler';
import { ok } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import * as dashboard from './service';

const optionsSchema = z.object({
  days: z.coerce.number().int().min(7).max(180).default(30),
  timezone: z.string().default('Asia/Kolkata'),
});

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const options = optionsSchema.parse(req.query);
    ok(res, await dashboard.getDashboard(options));
  }),
);

dashboardRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const options = optionsSchema.parse(req.query);
    ok(res, await dashboard.getSummary(options));
  }),
);

dashboardRouter.get(
  '/timeseries',
  asyncHandler(async (req, res) => {
    const options = optionsSchema.parse(req.query);
    ok(res, await dashboard.getTimeseries(options));
  }),
);

dashboardRouter.get(
  '/breakdown',
  asyncHandler(async (_req, res) => {
    const [status, service, cities] = await Promise.all([
      dashboard.getStatusBreakdown(),
      dashboard.getServiceBreakdown(),
      dashboard.getCityBreakdown(),
    ]);
    ok(res, { status, service, cities });
  }),
);

dashboardRouter.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const limit = z.coerce.number().int().min(1).max(50).default(12).parse(req.query.limit ?? 12);
    ok(res, await dashboard.getRecentActivity(limit));
  }),
);
