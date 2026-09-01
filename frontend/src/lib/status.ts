export type BookingStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'ON_THE_WAY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type MechanicStatus = 'AVAILABLE' | 'ON_JOB' | 'OFF_DUTY';

interface StatusStyle {
  label: string;
  /** Tailwind classes for the pill. */
  pill: string;
  dot: string;
  /** Hex used by charts, read from the same source of truth. */
  chart: string;
}

export const BOOKING_STATUS: Record<BookingStatus, StatusStyle> = {
  PENDING: {
    label: 'Pending',
    pill: 'bg-signal/12 text-signal border-signal/30',
    dot: 'bg-signal',
    chart: '#f5a524',
  },
  ASSIGNED: {
    label: 'Assigned',
    pill: 'bg-queue/12 text-queue border-queue/30',
    dot: 'bg-queue',
    chart: '#a78bfa',
  },
  ON_THE_WAY: {
    label: 'On the way',
    pill: 'bg-route/12 text-route border-route/30',
    dot: 'bg-route',
    chart: '#4c9aff',
  },
  IN_PROGRESS: {
    label: 'In progress',
    pill: 'bg-route/16 text-route border-route/40',
    dot: 'bg-route',
    chart: '#2f8fe0',
  },
  COMPLETED: {
    label: 'Completed',
    pill: 'bg-go/12 text-go border-go/30',
    dot: 'bg-go',
    chart: '#2fbf71',
  },
  CANCELLED: {
    label: 'Cancelled',
    pill: 'bg-halt/12 text-halt border-halt/30',
    dot: 'bg-halt',
    chart: '#ff5c5c',
  },
};

export const MECHANIC_STATUS: Record<MechanicStatus, StatusStyle> = {
  AVAILABLE: {
    label: 'Available',
    pill: 'bg-go/12 text-go border-go/30',
    dot: 'bg-go',
    chart: '#2fbf71',
  },
  ON_JOB: {
    label: 'On a job',
    pill: 'bg-route/12 text-route border-route/30',
    dot: 'bg-route',
    chart: '#4c9aff',
  },
  OFF_DUTY: {
    label: 'Off duty',
    pill: 'bg-muted/12 text-muted border-muted/30',
    dot: 'bg-muted',
    chart: '#8fa0b3',
  },
};

/** The order a job moves through, used by the pipeline strip. */
export const PIPELINE: BookingStatus[] = [
  'PENDING',
  'ASSIGNED',
  'ON_THE_WAY',
  'IN_PROGRESS',
  'COMPLETED',
];

export const NEXT_STATUS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ON_THE_WAY', 'CANCELLED'],
  ON_THE_WAY: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const CATEGORY_LABEL: Record<string, string> = {
  PERIODIC_SERVICE: 'Periodic service',
  BREAKDOWN: 'Breakdown',
  BATTERY: 'Battery',
  TYRES: 'Tyres',
  AC_SERVICE: 'AC service',
  DENT_PAINT: 'Dent & paint',
  INSPECTION: 'Inspection',
};

export const CATEGORY_COLOR: Record<string, string> = {
  PERIODIC_SERVICE: '#f5a524',
  BREAKDOWN: '#ff5c5c',
  BATTERY: '#2fbf71',
  TYRES: '#4c9aff',
  AC_SERVICE: '#38bdf8',
  DENT_PAINT: '#a78bfa',
  INSPECTION: '#f472b6',
};
