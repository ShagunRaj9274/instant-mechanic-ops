'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { get, type Envelope } from '@/lib/api';
import type {
  Booking,
  BookingDetail,
  Customer,
  Dashboard,
  Mechanic,
  MechanicDetail,
  Service,
} from '@/lib/types';

const STALE = 30_000;

export function useDashboard(days = 30) {
  return useQuery({
    queryKey: ['dashboard', days],
    queryFn: async () => (await get<Dashboard>('/api/v1/dashboard', { days })).data,
    staleTime: STALE,
    // The socket drives updates; this is only a safety net if it drops.
    refetchInterval: 60_000,
  });
}

export interface BookingFilters {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  serviceId?: string;
  mechanicId?: string;
  customerId?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function useBookings(filters: BookingFilters) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () =>
      (await get<Booking[]>('/api/v1/bookings', { ...filters })) as Envelope<Booking[]>,
    staleTime: 15_000,
    // Keeps the table on screen while a new page or filter loads.
    placeholderData: keepPreviousData,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => (await get<BookingDetail>(`/api/v1/bookings/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useMechanics(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  sortBy: string;
}) {
  return useQuery({
    queryKey: ['mechanics', params],
    queryFn: async () => (await get<Mechanic[]>('/api/v1/mechanics', { ...params })) as Envelope<Mechanic[]>,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useMechanic(id: string) {
  return useQuery({
    queryKey: ['mechanic', id],
    queryFn: async () => (await get<MechanicDetail>(`/api/v1/mechanics/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useCustomers(params: {
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => (await get<Customer[]>('/api/v1/customers', { ...params })) as Envelope<Customer[]>,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => (await get<Service[]>('/api/v1/services')).data,
    staleTime: 10 * 60_000,
  });
}
