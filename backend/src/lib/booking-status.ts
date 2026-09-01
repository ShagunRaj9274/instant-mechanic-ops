import type { BookingStatus } from '../db/schema';

/**
 * The dispatch state machine. Everything that moves a booking - the API, the
 * live simulator - goes through this table, so the rules live in one place.
 */
export const STATUS_FLOW: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ON_THE_WAY', 'CANCELLED'],
  ON_THE_WAY: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const ACTIVE_STATUSES: BookingStatus[] = [
  'PENDING',
  'ASSIGNED',
  'ON_THE_WAY',
  'IN_PROGRESS',
];

export const TERMINAL_STATUSES: BookingStatus[] = ['COMPLETED', 'CANCELLED'];

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return STATUS_FLOW[from]?.includes(to) ?? false;
}

export function nextStatus(from: BookingStatus): BookingStatus | null {
  const [next] = STATUS_FLOW[from];
  return next ?? null;
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  ON_THE_WAY: 'On the way',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
