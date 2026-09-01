import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { openapiSpec } from './docs/openapi';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiLimiter } from './middleware/rate-limit';
import { requestLogger } from './middleware/request-logger';
import { authRouter } from './modules/auth/routes';
import { bookingsRouter } from './modules/bookings/routes';
import { customersRouter } from './modules/customers/routes';
import { dashboardRouter } from './modules/dashboard/routes';
import { mechanicsRouter } from './modules/mechanics/routes';
import { servicesRouter } from './modules/services/routes';
import { connectedClients } from './realtime/io';
import { sql } from './db';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin tools (curl, Swagger UI) send no Origin header.
        if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
          return callback(null, true);
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(compression());
  app.use(requestLogger);

  /** Liveness probe for the load balancer; also reports socket fan-out size. */
  app.get('/health', async (_req, res) => {
    try {
      await sql`SELECT 1`;
      res.json({
        status: 'ok',
        uptime: Number(process.uptime().toFixed(0)),
        database: 'connected',
        realtimeClients: connectedClients(),
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'Instant Mechanic Operations API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/health',
    });
  });

  app.get('/api/docs.json', (_req, res) => res.json(openapiSpec));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customSiteTitle: 'Instant Mechanic API',
      swaggerOptions: { persistAuthorization: true, docExpansion: 'list' },
    }),
  );

  const v1 = express.Router();
  v1.use(apiLimiter);
  v1.use('/auth', authRouter);
  v1.use('/dashboard', dashboardRouter);
  v1.use('/bookings', bookingsRouter);
  v1.use('/mechanics', mechanicsRouter);
  v1.use('/customers', customersRouter);
  v1.use('/services', servicesRouter);
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
