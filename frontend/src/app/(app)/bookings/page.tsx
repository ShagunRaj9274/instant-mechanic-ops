'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Download,
  Inbox,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useBookings, useServices, type BookingFilters } from '@/hooks/use-queries';
import { useToast } from '@/hooks/use-toast';
import { downloadCsv } from '@/lib/api';
import { dateTime, money, number } from '@/lib/format';
import { BOOKING_STATUS, CATEGORY_LABEL, PIPELINE } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button, EmptyState, ErrorState, Panel, Skeleton } from '@/components/ui/primitives';
import { Pagination } from '@/components/ui/pagination';
import { StatusPill } from '@/components/ui/status-pill';

const STATUS_OPTIONS = [...PIPELINE, 'CANCELLED' as const];

const COLUMNS: Array<{ key: string; label: string; sortable?: boolean; className?: string }> = [
  { key: 'reference', label: 'Booking', sortable: true },
  { key: 'customer', label: 'Customer' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'service', label: 'Service' },
  { key: 'mechanic', label: 'Mechanic' },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true, className: 'text-right' },
  { key: 'scheduledAt', label: 'Scheduled', sortable: true },
];

function BookingsTable() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { data: services } = useServices();

  const [filters, setFilters] = useState<BookingFilters>(() => ({
    page: 1,
    limit: 25,
    search: params.get('search') ?? '',
    status: params.get('status') ?? '',
    serviceId: params.get('serviceId') ?? '',
    mechanicId: params.get('mechanicId') ?? '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }));
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.search === searchInput ? current : { ...current, search: searchInput, page: 1 },
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isPending, isFetching, isError, error, refetch } = useBookings(filters);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  const update = useCallback((patch: Partial<BookingFilters>) => {
    setFilters((current) => ({ ...current, page: 1, ...patch }));
  }, []);

  const toggleSort = (key: string) => {
    setFilters((current) => ({
      ...current,
      sortBy: key,
      sortOrder: current.sortBy === key && current.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  const activeFilters = useMemo(
    () =>
      [filters.status, filters.serviceId, filters.dateFrom, filters.dateTo].filter(Boolean).length,
    [filters],
  );

  const clearAll = () => {
    setSearchInput('');
    setFilters({ page: 1, limit: filters.limit, sortBy: 'createdAt', sortOrder: 'desc' });
    router.replace('/bookings');
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsv(
        '/api/v1/bookings/export',
        { ...filters, page: 1 },
        `bookings-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast({ tone: 'success', title: 'Export ready', description: 'The CSV is in your downloads.' });
    } catch {
      toast({ tone: 'error', title: 'Export failed', description: 'Try narrowing the filters first.' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="mt-1 text-sm text-muted">
            {meta ? `${number(meta.total)} jobs match your filters` : 'Loading the job list…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowFilters((open) => !open)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilters ? (
              <span className="tabular rounded-full bg-signal/20 px-1.5 text-[10px] font-semibold text-signal">
                {activeFilters}
              </span>
            ) : null}
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={exporting || !rows.length}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Preparing…' : 'Export CSV'}
          </Button>
        </div>
      </header>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by booking ID, customer, phone, registration or mechanic"
                className="field w-full pl-9"
                aria-label="Search bookings"
              />
              {searchInput ? (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_OPTIONS.map((status) => {
                const selected = filters.status?.split(',').includes(status);
                return (
                  <button
                    key={status}
                    onClick={() => {
                      const current = filters.status ? filters.status.split(',') : [];
                      const next = selected
                        ? current.filter((value) => value !== status)
                        : [...current, status];
                      update({ status: next.join(',') });
                    }}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      selected
                        ? BOOKING_STATUS[status].pill
                        : 'border-line text-muted hover:border-muted/50 hover:text-ink',
                    )}
                  >
                    {BOOKING_STATUS[status].label}
                  </button>
                );
              })}
            </div>
          </div>

          {showFilters ? (
            <div className="grid animate-slide-in grid-cols-1 gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Service</span>
                <select
                  className="field w-full"
                  value={filters.serviceId ?? ''}
                  onChange={(event) => update({ serviceId: event.target.value })}
                >
                  <option value="">All services</option>
                  {(services ?? []).map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} · {CATEGORY_LABEL[service.category] ?? service.category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Booked from</span>
                <input
                  type="date"
                  className="field w-full"
                  value={filters.dateFrom ?? ''}
                  onChange={(event) => update({ dateFrom: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Booked until</span>
                <input
                  type="date"
                  className="field w-full"
                  value={filters.dateTo ?? ''}
                  onChange={(event) => update({ dateTo: event.target.value })}
                />
              </label>
              <div className="flex items-end">
                <Button size="sm" variant="ghost" onClick={clearAll}>
                  Clear all filters
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'The booking list did not load.'}
            onRetry={() => refetch()}
          />
        ) : isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title="No bookings match this view"
            description="Try a different status, widen the date range, or clear the search to see the full list."
            action={
              <Button size="sm" onClick={clearAll}>
                Clear all filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className={cn('px-4 py-2.5 text-xs font-medium text-muted', column.className)}
                    >
                      {column.sortable ? (
                        <button
                          onClick={() => toggleSort(column.key)}
                          className={cn(
                            'inline-flex items-center gap-1 transition-colors hover:text-ink',
                            filters.sortBy === column.key && 'text-ink',
                          )}
                        >
                          {column.label}
                          {filters.sortBy === column.key ? (
                            filters.sortOrder === 'desc' ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUp className="h-3 w-3" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cn('transition-opacity', isFetching && 'opacity-60')}>
                {rows.map((booking) => (
                  <tr key={booking.id} className="row-link border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="tabular font-medium text-signal hover:underline"
                      >
                        {booking.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{booking.customer.name}</p>
                      <p className="text-xs text-muted">{booking.city}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p>
                        {booking.vehicle.make} {booking.vehicle.model}
                      </p>
                      <p className="tabular text-xs text-muted">{booking.vehicle.registration}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p>{booking.service.name}</p>
                      <p className="text-xs text-muted">
                        {CATEGORY_LABEL[booking.service.category] ?? booking.service.category}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      {booking.mechanic ? (
                        <Link
                          href={`/mechanics/${booking.mechanic.id}`}
                          className="hover:text-signal hover:underline"
                        >
                          {booking.mechanic.name}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill
                        status={booking.status}
                        pulse={booking.status === 'IN_PROGRESS' || booking.status === 'ON_THE_WAY'}
                      />
                    </td>
                    <td className="tabular px-4 py-2.5 text-right font-medium">
                      {money(booking.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {dateTime(booking.scheduledAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && rows.length > 0 ? (
          <Pagination
            meta={meta}
            label="bookings"
            onPage={(page) => setFilters((current) => ({ ...current, page }))}
            onLimit={(limit) => setFilters((current) => ({ ...current, limit, page: 1 }))}
          />
        ) : null}
      </Panel>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
      <BookingsTable />
    </Suspense>
  );
}
