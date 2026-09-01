import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler';
import { buildMeta, ok } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import * as customersService from './service';

export const customersRouter = Router();

customersRouter.use(requireAuth);

customersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = customersService.listCustomersQuery.parse(req.query);
    const { items, total } = await customersService.listCustomers(query);
    ok(res, items, buildMeta(query.page, query.limit, total));
  }),
);

customersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = z.string().uuid('Customer id must be a uuid').parse(req.params.id);
    ok(res, await customersService.getCustomerById(id));
  }),
);
