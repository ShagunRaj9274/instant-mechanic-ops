import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { ok } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rate-limit';
import { login, loginBody } from './service';

export const authRouter = Router();

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = loginBody.parse(req.body);
    ok(res, await login(body));
  }),
);

authRouter.get('/me', requireAuth, (req, res) => {
  ok(res, req.user);
});
