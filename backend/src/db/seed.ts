import { db, sql } from './index';
import {
  bookingEvents,
  bookings,
  customers,
  mechanics,
  services,
  users,
  vehicles,
} from './schema';
import type { BookingStatus, ServiceCategory } from './schema';
import { hashPassword } from '../lib/password';
import { logger } from '../lib/logger';

/**
 * Seeds a realistic operations dataset. The generator is deterministic - the
 * same seed produces the same database - so screenshots, tests and the demo
 * always line up.
 *
 *   npm run db:seed          append to an empty database
 *   npm run db:reset         wipe first, then seed
 */

/* ------------------------------- utilities ------------------------------- */

let state = 20240815;
const random = () => {
  state = (state * 1103515245 + 12345) & 0x7fffffff;
  return state / 0x7fffffff;
};
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
const int = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const chance = (p: number) => random() < p;
const round2 = (n: number) => Math.round(n * 100) / 100;

/* --------------------------------- data ---------------------------------- */

const CITIES = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, weight: 30 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777, weight: 22 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209, weight: 18 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567, weight: 12 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867, weight: 10 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, weight: 8 },
] as const;

const LOCALITIES = [
  'Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Andheri East',
  'Bandra West', 'Powai', 'Saket', 'Dwarka', 'Rohini', 'Baner', 'Kothrud',
  'Gachibowli', 'Madhapur', 'Adyar', 'Velachery',
];

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Aadhya', 'Kavya', 'Riya', 'Meera',
  'Sneha', 'Priya', 'Neha', 'Pooja', 'Rahul', 'Rohit', 'Karan', 'Nikhil',
  'Farhan', 'Zoya', 'Imran', 'Tanvi', 'Sanjay', 'Deepak', 'Manish', 'Preeti',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Mehta',
  'Kulkarni', 'Joshi', 'Rao', 'Chauhan', 'Bose', 'Das', 'Kapoor', 'Malhotra',
  'Sinha', 'Pillai', 'Bhat', 'Shetty', 'Khan', 'Qureshi', 'Menon', 'Naidu',
];

const VEHICLES = [
  { make: 'Maruti Suzuki', model: 'Swift', type: 'HATCHBACK' },
  { make: 'Maruti Suzuki', model: 'Baleno', type: 'HATCHBACK' },
  { make: 'Hyundai', model: 'i20', type: 'HATCHBACK' },
  { make: 'Hyundai', model: 'Creta', type: 'SUV' },
  { make: 'Tata', model: 'Nexon', type: 'SUV' },
  { make: 'Tata', model: 'Punch', type: 'SUV' },
  { make: 'Mahindra', model: 'XUV700', type: 'SUV' },
  { make: 'Honda', model: 'City', type: 'SEDAN' },
  { make: 'Honda', model: 'Amaze', type: 'SEDAN' },
  { make: 'Toyota', model: 'Innova Crysta', type: 'VAN' },
  { make: 'Kia', model: 'Seltos', type: 'SUV' },
  { make: 'Volkswagen', model: 'Virtus', type: 'SEDAN' },
  { make: 'Royal Enfield', model: 'Classic 350', type: 'BIKE' },
  { make: 'Bajaj', model: 'Pulsar 150', type: 'BIKE' },
  { make: 'Honda', model: 'Activa 6G', type: 'BIKE' },
] as const;

const SERVICE_CATALOGUE: Array<{
  name: string;
  category: ServiceCategory;
  basePrice: number;
  durationMinutes: number;
  description: string;
  weight: number;
}> = [
  { name: 'Basic periodic service', category: 'PERIODIC_SERVICE', basePrice: 2499, durationMinutes: 90, description: 'Engine oil, oil filter, top-ups and a 20-point check', weight: 20 },
  { name: 'Comprehensive service', category: 'PERIODIC_SERVICE', basePrice: 5499, durationMinutes: 180, description: 'Full service with all filters, brake clean and diagnostics', weight: 12 },
  { name: 'Roadside breakdown assist', category: 'BREAKDOWN', basePrice: 1299, durationMinutes: 60, description: 'On-spot diagnosis and repair for a stranded vehicle', weight: 14 },
  { name: 'Engine overheating repair', category: 'BREAKDOWN', basePrice: 3899, durationMinutes: 150, description: 'Coolant system inspection, flush and hose replacement', weight: 5 },
  { name: 'Battery jumpstart', category: 'BATTERY', basePrice: 599, durationMinutes: 30, description: 'Jumpstart with a health report on the battery', weight: 12 },
  { name: 'Battery replacement', category: 'BATTERY', basePrice: 4899, durationMinutes: 45, description: 'New battery fitted at your doorstep with old-battery buyback', weight: 8 },
  { name: 'Wheel alignment and balancing', category: 'TYRES', basePrice: 1499, durationMinutes: 60, description: 'Four-wheel alignment with computerised balancing', weight: 9 },
  { name: 'Tyre replacement', category: 'TYRES', basePrice: 6499, durationMinutes: 75, description: 'Tyre fitting, balancing and disposal of the old set', weight: 6 },
  { name: 'AC gas top-up', category: 'AC_SERVICE', basePrice: 2199, durationMinutes: 60, description: 'Refrigerant top-up with a leak test', weight: 8 },
  { name: 'AC deep service', category: 'AC_SERVICE', basePrice: 4299, durationMinutes: 150, description: 'Cooling coil clean, filter change and compressor check', weight: 5 },
  { name: 'Dent removal', category: 'DENT_PAINT', basePrice: 3299, durationMinutes: 240, description: 'Paintless dent removal for up to two panels', weight: 4 },
  { name: 'Panel repaint', category: 'DENT_PAINT', basePrice: 7899, durationMinutes: 480, description: 'Colour-matched repaint with clear coat and polish', weight: 3 },
  { name: 'Pre-purchase inspection', category: 'INSPECTION', basePrice: 1999, durationMinutes: 90, description: '150-point inspection with a photo report', weight: 6 },
  { name: 'Insurance claim inspection', category: 'INSPECTION', basePrice: 999, durationMinutes: 45, description: 'Damage assessment and documentation for a claim', weight: 4 },
];

const NOTES = [
  'Customer asked for a call 15 minutes before arrival',
  'Gate code 4412, park in visitor bay',
  'Vehicle will not start, parked in basement B2',
  'Please carry a card machine',
  'Second service under the annual package',
  'Warning light on the dashboard since yesterday',
  '',
  '',
];

/* ------------------------------ generators ------------------------------- */

const weightedCity = () => {
  const total = CITIES.reduce((sum, c) => sum + c.weight, 0);
  let roll = random() * total;
  for (const city of CITIES) {
    roll -= city.weight;
    if (roll <= 0) return city;
  }
  return CITIES[0];
};

const weightedService = <T extends { weight: number }>(list: T[]) => {
  const total = list.reduce((sum, s) => sum + s.weight, 0);
  let roll = random() * total;
  for (const item of list) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return list[0] as T;
};

const personName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
const slug = (name: string, salt: number) =>
  `${name.toLowerCase().replace(/[^a-z]/g, '.')}${salt}`;
const phone = () => `+91 ${int(70, 99)}${int(10000000, 99999999)}`.slice(0, 17);
const jitter = (value: number, spread = 0.09) => value + (random() - 0.5) * spread;

const registration = (index: number) => {
  const states = ['KA', 'MH', 'DL', 'TS', 'TN', 'HR'];
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return `${pick(states)}${String(int(1, 51)).padStart(2, '0')}${
    letters[index % letters.length]
  }${letters[(index * 7) % letters.length]}${String(1000 + (index * 137) % 9000)}`;
};

/**
 * Status depends on when the job is scheduled: past jobs are closed, jobs in
 * the next few hours are mid-flight, later jobs are still pending. That is what
 * makes the dashboard look like a real operations screen instead of noise.
 */
function statusFor(scheduledAt: Date, now: Date): BookingStatus {
  const hoursAway = (scheduledAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursAway < -6) return chance(0.9) ? 'COMPLETED' : 'CANCELLED';
  if (hoursAway < -1) {
    if (chance(0.6)) return 'COMPLETED';
    return chance(0.7) ? 'IN_PROGRESS' : 'CANCELLED';
  }
  if (hoursAway < 1) return pick(['IN_PROGRESS', 'ON_THE_WAY', 'ON_THE_WAY', 'ASSIGNED']);
  if (hoursAway < 6) return chance(0.55) ? 'ASSIGNED' : 'PENDING';
  return chance(0.85) ? 'PENDING' : 'ASSIGNED';
}

const TIMELINE: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['PENDING'],
  ASSIGNED: ['PENDING', 'ASSIGNED'],
  ON_THE_WAY: ['PENDING', 'ASSIGNED', 'ON_THE_WAY'],
  IN_PROGRESS: ['PENDING', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS'],
  COMPLETED: ['PENDING', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'],
  CANCELLED: ['PENDING', 'CANCELLED'],
};

/* --------------------------------- seed ---------------------------------- */

const COUNTS = { customers: 72, mechanics: 26, bookings: 680 };

async function reset() {
  logger.warn('Wiping existing data');
  await sql`TRUNCATE TABLE booking_events, bookings, vehicles, customers, mechanics, services, users RESTART IDENTITY CASCADE`;
}

async function seed() {
  const now = new Date();

  /* users -------------------------------------------------------------- */
  const demoUsers = [
    { name: 'Ops Console', email: 'ops@instantmechanic.com', password: 'instant123', role: 'OPS' as const },
    { name: 'Priya Menon', email: 'admin@instantmechanic.com', password: 'instant123', role: 'ADMIN' as const },
    { name: 'Read Only', email: 'viewer@instantmechanic.com', password: 'instant123', role: 'VIEWER' as const },
  ];
  await db.insert(users).values(
    demoUsers.map((u) => ({
      name: u.name,
      email: u.email,
      passwordHash: hashPassword(u.password),
      role: u.role,
    })),
  );

  /* services ----------------------------------------------------------- */
  const serviceRows = await db
    .insert(services)
    .values(
      SERVICE_CATALOGUE.map((s) => ({
        name: s.name,
        category: s.category,
        basePrice: s.basePrice.toFixed(2),
        durationMinutes: s.durationMinutes,
        description: s.description,
      })),
    )
    .returning({ id: services.id, name: services.name, basePrice: services.basePrice });

  const serviceLookup = SERVICE_CATALOGUE.map((s, i) => ({ ...s, id: serviceRows[i].id }));

  /* mechanics ---------------------------------------------------------- */
  const mechanicRows = await db
    .insert(mechanics)
    .values(
      Array.from({ length: COUNTS.mechanics }, (_, i) => {
        const city = weightedCity();
        const name = personName();
        return {
          name,
          email: `${slug(name, i)}@instantmechanic.com`,
          phone: phone(),
          status: 'AVAILABLE' as const,
          specialisation: pick(SERVICE_CATALOGUE).category,
          rating: round2(3.8 + random() * 1.2),
          jobsCompleted: 0,
          city: city.name,
          latitude: jitter(city.lat),
          longitude: jitter(city.lng),
          joinedAt: new Date(now.getTime() - int(30, 900) * 86_400_000),
        };
      }),
    )
    .returning({ id: mechanics.id, city: mechanics.city });

  /* customers and vehicles --------------------------------------------- */
  const customerRows = await db
    .insert(customers)
    .values(
      Array.from({ length: COUNTS.customers }, (_, i) => {
        const city = weightedCity();
        const name = personName();
        return {
          name,
          email: `${slug(name, i)}@example.com`,
          phone: phone(),
          city: city.name,
          address: `${int(1, 240)}, ${pick(LOCALITIES)}, ${city.name}`,
          // Spread signups across the last 6 months so "new customers" moves.
          createdAt: new Date(now.getTime() - int(0, 180) * 86_400_000),
        };
      }),
    )
    .returning({ id: customers.id, city: customers.city, address: customers.address });

  const vehicleValues = customerRows.flatMap((customer, i) =>
    Array.from({ length: chance(0.3) ? 2 : 1 }, (_, j) => {
      const spec = pick(VEHICLES);
      return {
        customerId: customer.id,
        make: spec.make,
        model: spec.model,
        year: int(2013, 2024),
        registration: registration(i * 3 + j),
        type: spec.type,
      };
    }),
  );
  const vehicleRows = await db
    .insert(vehicles)
    .values(vehicleValues)
    .returning({ id: vehicles.id, customerId: vehicles.customerId });

  const vehiclesByCustomer = new Map<string, string[]>();
  for (const v of vehicleRows) {
    const list = vehiclesByCustomer.get(v.customerId) ?? [];
    list.push(v.id);
    vehiclesByCustomer.set(v.customerId, list);
  }

  const mechanicsByCity = new Map<string, string[]>();
  for (const m of mechanicRows) {
    const list = mechanicsByCity.get(m.city) ?? [];
    list.push(m.id);
    mechanicsByCity.set(m.city, list);
  }

  /* bookings ------------------------------------------------------------ */
  type BookingSeed = typeof bookings.$inferInsert & { _status: BookingStatus };
  const bookingValues: BookingSeed[] = [];

  for (let i = 0; i < COUNTS.bookings; i += 1) {
    const customer = pick(customerRows);
    const vehicleIds = vehiclesByCustomer.get(customer.id) ?? [];
    if (!vehicleIds.length) continue;

    const service = weightedService(serviceLookup);
    // Weight recent days more heavily: a growing business, not a flat line.
    const daysAgo = Math.floor(Math.pow(random(), 1.6) * 89);
    const scheduledAt = new Date(now.getTime() - daysAgo * 86_400_000);
    scheduledAt.setHours(int(8, 20), pick([0, 15, 30, 45]), 0, 0);

    const status = statusFor(scheduledAt, now);
    const city = CITIES.find((c) => c.name === customer.city) ?? CITIES[0];
    const mechanicPool = mechanicsByCity.get(customer.city) ?? mechanicRows.map((m) => m.id);
    const needsMechanic = status !== 'PENDING' && !(status === 'CANCELLED' && chance(0.5));

    const createdAt = new Date(scheduledAt.getTime() - int(30, 2880) * 60_000);
    const completedAt =
      status === 'COMPLETED'
        ? new Date(scheduledAt.getTime() + service.durationMinutes * 60_000 + int(0, 45) * 60_000)
        : null;

    bookingValues.push({
      reference: `IM-${10001 + i}`,
      customerId: customer.id,
      vehicleId: pick(vehicleIds),
      serviceId: service.id,
      mechanicId: needsMechanic ? pick(mechanicPool) : null,
      status,
      amount: round2(service.basePrice * (0.85 + random() * 0.45)).toFixed(2),
      city: customer.city,
      address: customer.address,
      latitude: jitter(city.lat),
      longitude: jitter(city.lng),
      notes: pick(NOTES),
      scheduledAt,
      completedAt,
      createdAt,
      updatedAt: completedAt ?? scheduledAt,
      _status: status,
    });
  }

  const inserted: Array<{ id: string; status: BookingStatus; createdAt: Date }> = [];
  for (let i = 0; i < bookingValues.length; i += 100) {
    const chunk = bookingValues.slice(i, i + 100).map(({ _status, ...rest }) => rest);
    const rows = await db
      .insert(bookings)
      .values(chunk)
      .returning({ id: bookings.id, status: bookings.status, createdAt: bookings.createdAt });
    inserted.push(...rows);
  }

  /* timeline events ------------------------------------------------------ */
  const eventValues: Array<typeof bookingEvents.$inferInsert> = [];
  for (const booking of inserted) {
    const path = TIMELINE[booking.status];
    let cursor = new Date(booking.createdAt).getTime();
    path.forEach((step, index) => {
      cursor += index === 0 ? 0 : int(10, 90) * 60_000;
      eventValues.push({
        bookingId: booking.id,
        fromStatus: index === 0 ? null : path[index - 1],
        toStatus: step,
        actor: index === 0 ? 'customer-app' : 'dispatch',
        note: index === 0 ? 'Booking received' : '',
        createdAt: new Date(cursor),
      });
    });
  }
  for (let i = 0; i < eventValues.length; i += 400) {
    await db.insert(bookingEvents).values(eventValues.slice(i, i + 400));
  }

  /* derived state -------------------------------------------------------- */
  // Job counts and availability are derived from the bookings, so the numbers
  // on the mechanics page always agree with the booking table.
  await sql`
    UPDATE mechanics m SET jobs_completed = COALESCE(x.count, 0)
    FROM (SELECT mechanic_id, count(*)::int AS count FROM bookings
          WHERE status = 'COMPLETED' AND mechanic_id IS NOT NULL GROUP BY mechanic_id) x
    WHERE x.mechanic_id = m.id
  `;
  await sql`
    UPDATE mechanics SET status = 'ON_JOB'
    WHERE id IN (SELECT DISTINCT mechanic_id FROM bookings
                 WHERE status IN ('ASSIGNED','ON_THE_WAY','IN_PROGRESS') AND mechanic_id IS NOT NULL)
  `;
  await sql`
    UPDATE mechanics SET status = 'OFF_DUTY'
    WHERE status = 'AVAILABLE' AND random() < 0.18
  `;

  const [counts] = await sql<Array<Record<string, number>>>`
    SELECT
      (SELECT count(*)::int FROM customers) AS customers,
      (SELECT count(*)::int FROM vehicles) AS vehicles,
      (SELECT count(*)::int FROM mechanics) AS mechanics,
      (SELECT count(*)::int FROM services) AS services,
      (SELECT count(*)::int FROM bookings) AS bookings,
      (SELECT count(*)::int FROM booking_events) AS events
  `;

  logger.info('Seed complete', counts);
  logger.info('Sign in with ops@instantmechanic.com / instant123');
}

async function main() {
  if (process.argv.includes('--reset')) await reset();

  const [{ count }] = await sql<Array<{ count: number }>>`SELECT count(*)::int FROM bookings`;
  if (count > 0) {
    logger.warn(`Database already holds ${count} bookings. Run "npm run db:reset" to rebuild.`);
    await sql.end();
    return;
  }

  await seed();
  await sql.end();
}

main().catch(async (error) => {
  logger.error('Seed failed', error instanceof Error ? error.message : error);
  await sql.end();
  process.exit(1);
});
