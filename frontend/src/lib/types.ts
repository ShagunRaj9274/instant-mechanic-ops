import type { BookingStatus, MechanicStatus } from './status';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPS' | 'VIEWER';
}

export interface Booking {
  id: string;
  reference: string;
  status: BookingStatus;
  amount: number;
  city: string;
  address: string;
  notes: string;
  scheduledAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; phone: string; email: string };
  vehicle: { make: string; model: string; year: number; registration: string; type: string };
  service: { id: string; name: string; category: string; durationMinutes: number };
  mechanic: { id: string; name: string; status: MechanicStatus; phone: string } | null;
}

export interface BookingEvent {
  id: string;
  bookingId: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  note: string;
  actor: string;
  createdAt: string;
}

export interface BookingDetail extends Booking {
  timeline: BookingEvent[];
}

export interface Mechanic {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: MechanicStatus;
  specialisation: string;
  rating: number;
  jobsCompleted: number;
  city: string;
  location: { latitude: number; longitude: number };
  joinedAt: string;
  revenue: number;
  currentBooking: {
    id: string;
    reference: string;
    status: BookingStatus;
    customer: string;
    service: string;
    scheduledAt: string;
  } | null;
}

export interface MechanicDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: MechanicStatus;
  specialisation: string;
  rating: number;
  jobsCompleted: number;
  city: string;
  latitude: number;
  longitude: number;
  joinedAt: string;
  stats: {
    totalJobs: number;
    completedJobs: number;
    cancelledJobs: number;
    revenue: number;
    avgTurnaroundHours: number;
  };
  recentBookings: Array<{
    id: string;
    reference: string;
    status: BookingStatus;
    amount: number;
    scheduledAt: string;
    completedAt: string | null;
    customerName: string;
    serviceName: string;
  }>;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  createdAt: string;
  totalBookings: number;
  totalSpend: number;
  lastBookingAt: string | null;
  vehicleCount: number;
}

export interface DashboardSummary {
  totalBookings: number;
  todayBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  inFlightBookings: number;
  totalRevenue: number;
  todayRevenue: number;
  activeMechanics: number;
  totalMechanics: number;
  newCustomers: number;
  totalCustomers: number;
  averageTicket: number;
  completionRate: number;
  cancellationRate: number;
  trends: { bookings: number; revenue: number; customers: number };
  window: { days: number; timezone: string };
}

export interface ActivityItem {
  id: string;
  bookingId: string;
  reference: string;
  customerName: string;
  mechanicName: string | null;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actor: string;
  createdAt: string;
}

export interface Dashboard {
  summary: DashboardSummary;
  timeseries: Array<{
    date: string;
    bookings: number;
    completed: number;
    cancelled: number;
    revenue: number;
  }>;
  statusBreakdown: Array<{ status: BookingStatus; count: number; value: number }>;
  serviceBreakdown: Array<{
    category: string;
    bookings: number;
    revenue: number;
    averageTicket: number;
  }>;
  recentActivity: ActivityItem[];
  topMechanics: Array<{
    id: string;
    name: string;
    status: MechanicStatus;
    rating: number;
    jobsCompleted: number;
    revenue: number;
  }>;
  cities: Array<{ city: string; bookings: number; revenue: number }>;
  generatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  durationMinutes: number;
  description: string;
}
