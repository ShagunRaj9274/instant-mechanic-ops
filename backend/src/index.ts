import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { sql } from './db';
import { logger } from './lib/logger';
import { initRealtime } from './realtime/io';
import { startSimulator, stopSimulator } from './realtime/simulator';

async function main() {
  // Fail before accepting traffic if the database is not reachable.
  await sql`SELECT 1`;
  logger.info('Database connection established');

  const app = createApp();
  const server = createServer(app);
  initRealtime(server);

  server.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
    logger.info(`Docs at http://localhost:${env.PORT}/api/docs`);
    startSimulator();
  });

  const shutdown = async (signal: string) => {
    logger.warn(`${signal} received, shutting down`);
    stopSimulator();
    server.close(() => logger.info('HTTP server closed'));
    await sql.end({ timeout: 5 });
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', String(reason)));
}

main().catch((error) => {
  logger.error('Failed to start API', error instanceof Error ? error.message : error);
  process.exit(1);
});
