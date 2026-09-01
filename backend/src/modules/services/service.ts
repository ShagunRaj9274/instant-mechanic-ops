import { asc } from 'drizzle-orm';
import { db } from '../../db';
import { services } from '../../db/schema';

export async function listServices() {
  const rows = await db.select().from(services).orderBy(asc(services.name));
  return rows.map((s) => ({ ...s, basePrice: Number(s.basePrice) }));
}
