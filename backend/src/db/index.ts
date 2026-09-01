import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env';
import * as schema from './schema';

/**
 * A single pooled connection is shared by the HTTP server and the realtime
 * simulator. `max` is deliberately small: the free-tier database caps
 * connections, and every query here is short lived.
 */
export const sql = postgres(env.DATABASE_URL, {
  max: env.isProd ? 10 : 5,
  idle_timeout: 20,
  connect_timeout: 15,
  ssl: env.DATABASE_URL.includes('sslmode=require') ? 'require' : undefined,
  onnotice: () => {},
});

export const db = drizzle(sql, { schema });

export type Database = typeof db;
export { schema };
