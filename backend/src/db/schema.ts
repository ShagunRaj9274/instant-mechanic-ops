import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'OPS', 'VIEWER']);

/** The job lifecycle an operations team watches all day. */
export const bookingStatusEnum = pgEnum('booking_status', [
  'PENDING',
  'ASSIGNED',
  'ON_THE_WAY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const mechanicStatusEnum = pgEnum('mechanic_status', ['AVAILABLE', 'ON_JOB', 'OFF_DUTY']);

export const serviceCategoryEnum = pgEnum('service_category', [
  'PERIODIC_SERVICE',
  'BREAKDOWN',
  'BATTERY',
  'TYRES',
  'AC_SERVICE',
  'DENT_PAINT',
  'INSPECTION',
]);

export const vehicleTypeEnum = pgEnum('vehicle_type', ['HATCHBACK', 'SEDAN', 'SUV', 'BIKE', 'VAN']);

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 160 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('OPS'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ emailIdx: uniqueIndex('users_email_idx').on(t.email) }),
);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 160 }).notNull(),
    phone: varchar('phone', { length: 24 }).notNull(),
    city: varchar('city', { length: 80 }).notNull(),
    address: text('address').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex('customers_email_idx').on(t.email),
    createdAtIdx: index('customers_created_at_idx').on(t.createdAt),
  }),
);

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    make: varchar('make', { length: 60 }).notNull(),
    model: varchar('model', { length: 60 }).notNull(),
    year: integer('year').notNull(),
    registration: varchar('registration', { length: 20 }).notNull(),
    type: vehicleTypeEnum('type').notNull(),
  },
  (t) => ({
    customerIdx: index('vehicles_customer_idx').on(t.customerId),
    registrationIdx: uniqueIndex('vehicles_registration_idx').on(t.registration),
  }),
);

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  category: serviceCategoryEnum('category').notNull(),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  description: text('description').notNull().default(''),
});

export const mechanics = pgTable(
  'mechanics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 160 }).notNull(),
    phone: varchar('phone', { length: 24 }).notNull(),
    status: mechanicStatusEnum('status').notNull().default('AVAILABLE'),
    specialisation: serviceCategoryEnum('specialisation').notNull(),
    rating: doublePrecision('rating').notNull().default(4.5),
    jobsCompleted: integer('jobs_completed').notNull().default(0),
    city: varchar('city', { length: 80 }).notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex('mechanics_email_idx').on(t.email),
    statusIdx: index('mechanics_status_idx').on(t.status),
  }),
);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Human readable id shown in the UI, e.g. IM-24081. */
    reference: varchar('reference', { length: 16 }).notNull(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    mechanicId: uuid('mechanic_id').references(() => mechanics.id, { onDelete: 'set null' }),
    status: bookingStatusEnum('status').notNull().default('PENDING'),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    city: varchar('city', { length: 80 }).notNull(),
    address: text('address').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    notes: text('notes').notNull().default(''),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    referenceIdx: uniqueIndex('bookings_reference_idx').on(t.reference),
    statusIdx: index('bookings_status_idx').on(t.status),
    createdAtIdx: index('bookings_created_at_idx').on(t.createdAt),
    scheduledAtIdx: index('bookings_scheduled_at_idx').on(t.scheduledAt),
    mechanicIdx: index('bookings_mechanic_idx').on(t.mechanicId),
    customerIdx: index('bookings_customer_idx').on(t.customerId),
    serviceIdx: index('bookings_service_idx').on(t.serviceId),
  }),
);

/** Append-only audit trail; powers the booking timeline and the live feed. */
export const bookingEvents = pgTable(
  'booking_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    fromStatus: bookingStatusEnum('from_status'),
    toStatus: bookingStatusEnum('to_status').notNull(),
    note: text('note').notNull().default(''),
    actor: varchar('actor', { length: 120 }).notNull().default('system'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bookingIdx: index('booking_events_booking_idx').on(t.bookingId),
    createdAtIdx: index('booking_events_created_at_idx').on(t.createdAt),
  }),
);

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const customersRelations = relations(customers, ({ many }) => ({
  vehicles: many(vehicles),
  bookings: many(bookings),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  customer: one(customers, { fields: [vehicles.customerId], references: [customers.id] }),
  bookings: many(bookings),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  bookings: many(bookings),
}));

export const mechanicsRelations = relations(mechanics, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
  vehicle: one(vehicles, { fields: [bookings.vehicleId], references: [vehicles.id] }),
  service: one(services, { fields: [bookings.serviceId], references: [services.id] }),
  mechanic: one(mechanics, { fields: [bookings.mechanicId], references: [mechanics.id] }),
  events: many(bookingEvents),
}));

export const bookingEventsRelations = relations(bookingEvents, ({ one }) => ({
  booking: one(bookings, { fields: [bookingEvents.bookingId], references: [bookings.id] }),
}));

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type MechanicStatus = (typeof mechanicStatusEnum.enumValues)[number];
export type ServiceCategory = (typeof serviceCategoryEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Mechanic = typeof mechanics.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Service = typeof services.$inferSelect;
export type User = typeof users.$inferSelect;
