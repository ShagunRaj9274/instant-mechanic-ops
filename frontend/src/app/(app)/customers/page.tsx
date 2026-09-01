'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, UserX } from 'lucide-react';
import { useCustomers } from '@/hooks/use-queries';
import { dateTime, initials, money, number, relative } from '@/lib/format';
import { EmptyState, ErrorState, Panel, Skeleton } from '@/components/ui/primitives';
import { Pagination } from '@/components/ui/pagination';

function CustomersTable() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [debounced, setDebounced] = useState(search);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'createdAt' | 'totalSpend' | 'bookings' | 'name'>('totalSpend');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debounced, sortBy]);

  const { data, isPending, isError, error, refetch } = useCustomers({
    page,
    limit: 15,
    search: debounced,
    sortBy,
    sortOrder: sortBy === 'name' ? 'asc' : 'desc',
  });

  const customers = data?.data ?? [];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted">
            {data?.meta ? `${number(data.meta.total)} people in the book` : 'Loading customers…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email or phone"
              className="field w-full pl-9 sm:w-64"
              aria-label="Search customers"
            />
          </div>
          <select
            className="field"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            aria-label="Sort customers"
          >
            <option value="totalSpend">Highest spend</option>
            <option value="bookings">Most bookings</option>
            <option value="createdAt">Newest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </header>

      <Panel>
        {isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'The customer book did not load.'}
            onRetry={() => refetch()}
          />
        ) : isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<UserX className="h-5 w-5" />}
            title="Nobody matches that search"
            description="Try a phone number, part of an email, or clear the box to see everyone."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Contact</th>
                  <th className="px-4 py-2.5 font-medium">City</th>
                  <th className="px-4 py-2.5 text-right font-medium">Vehicles</th>
                  <th className="px-4 py-2.5 text-right font-medium">Bookings</th>
                  <th className="px-4 py-2.5 text-right font-medium">Lifetime spend</th>
                  <th className="px-4 py-2.5 font-medium">Last booking</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="row-link border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-queue/15 text-[11px] font-semibold text-queue">
                          {initials(customer.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{customer.name}</p>
                          <p className="text-xs text-muted">Joined {dateTime(customer.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="tabular text-xs">{customer.phone}</p>
                      <p className="truncate text-xs text-muted">{customer.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{customer.city}</td>
                    <td className="tabular px-4 py-2.5 text-right">{customer.vehicleCount}</td>
                    <td className="tabular px-4 py-2.5 text-right">{customer.totalBookings}</td>
                    <td className="tabular px-4 py-2.5 text-right font-medium">
                      {money(customer.totalSpend)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {customer.lastBookingAt ? relative(customer.lastBookingAt) : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.meta && customers.length > 0 ? (
          <Pagination meta={data.meta} label="customers" onPage={setPage} />
        ) : null}
      </Panel>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
      <CustomersTable />
    </Suspense>
  );
}
