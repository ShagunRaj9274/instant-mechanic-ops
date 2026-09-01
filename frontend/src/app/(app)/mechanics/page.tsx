'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, Star, UserX } from 'lucide-react';
import { useMechanics } from '@/hooks/use-queries';
import { money, number } from '@/lib/format';
import { CATEGORY_LABEL, MECHANIC_STATUS, type MechanicStatus } from '@/lib/status';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, Panel, Skeleton } from '@/components/ui/primitives';
import { Pagination } from '@/components/ui/pagination';
import { MechanicPill, StatusPill } from '@/components/ui/status-pill';

const FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Everyone' },
  { value: 'ON_JOB', label: 'On a job' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'OFF_DUTY', label: 'Off duty' },
];

export default function MechanicsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debounced, status]);

  const { data, isPending, isError, error, refetch } = useMechanics({
    page,
    limit: 12,
    search: debounced,
    status,
    sortBy: 'status',
  });

  const mechanics = data?.data ?? [];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Mechanics</h1>
          <p className="mt-1 text-sm text-muted">
            {data?.meta ? `${number(data.meta.total)} in the field team` : 'Loading the team…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or phone"
              className="field w-full pl-9 sm:w-64"
              aria-label="Search mechanics"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatus(filter.value)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  status === filter.value
                    ? filter.value
                      ? MECHANIC_STATUS[filter.value as MechanicStatus].pill
                      : 'border-signal/30 bg-signal/12 text-signal'
                    : 'border-line text-muted hover:border-muted/50 hover:text-ink',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {isError ? (
        <Panel>
          <ErrorState
            message={error instanceof Error ? error.message : 'The team list did not load.'}
            onRetry={() => refetch()}
          />
        </Panel>
      ) : isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-card" />
          ))}
        </div>
      ) : mechanics.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<UserX className="h-5 w-5" />}
            title="No mechanics match this view"
            description="Clear the search or pick a different availability filter."
          />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mechanics.map((mechanic) => (
              <Link
                key={mechanic.id}
                href={`/mechanics/${mechanic.id}`}
                className="panel flex flex-col p-4 transition-colors hover:border-signal/40 hover:bg-raised/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-[15px] font-semibold tracking-tight">
                      {mechanic.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {CATEGORY_LABEL[mechanic.specialisation] ?? mechanic.specialisation} ·{' '}
                      {mechanic.city}
                    </p>
                  </div>
                  <MechanicPill status={mechanic.status} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3">
                  <Stat label="Jobs done" value={number(mechanic.jobsCompleted)} />
                  <Stat label="Revenue" value={money(mechanic.revenue)} />
                  <Stat
                    label="Rating"
                    value={mechanic.rating.toFixed(1)}
                    icon={<Star className="h-3 w-3 fill-signal text-signal" />}
                  />
                </div>

                <div className="mt-3">
                  <p className="mb-1.5 text-xs text-muted">
                    {mechanic.status === 'ON_JOB' ? 'Working on' : 'Last job'}
                  </p>
                  {mechanic.currentBooking ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="tabular block truncate text-xs font-medium">
                          {mechanic.currentBooking.reference} · {mechanic.currentBooking.customer}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {mechanic.currentBooking.service}
                        </span>
                      </span>
                      <StatusPill status={mechanic.currentBooking.status} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted">No jobs assigned yet</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {data?.meta ? (
            <Panel>
              <Pagination meta={data.meta} label="mechanics" onPage={setPage} />
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="tabular mt-0.5 flex items-center gap-1 font-display text-sm font-semibold">
        {icon}
        {value}
      </p>
    </div>
  );
}
