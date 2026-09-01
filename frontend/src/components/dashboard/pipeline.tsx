'use client';

import Link from 'next/link';
import { BOOKING_STATUS, PIPELINE, type BookingStatus } from '@/lib/status';
import { number } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/primitives';

interface Props {
  counts: Record<string, number>;
  cancelled: number;
  loading?: boolean;
}

/**
 * The dispatch board. An operations lead reads left to right and immediately
 * sees where jobs are piling up, so this sits above the KPI tiles rather than
 * below them. Each stage links into the bookings table pre-filtered.
 */
export function Pipeline({ counts, cancelled, loading }: Props) {
  const live = PIPELINE.filter((status) => status !== 'COMPLETED').reduce(
    (sum, status) => sum + (counts[status] ?? 0),
    0,
  );

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight">Dispatch board</h2>
          <p className="mt-0.5 text-xs text-muted">
            {loading ? 'Reading the board…' : `${number(live)} jobs are open right now`}
          </p>
        </div>
        <Link
          href="/bookings?status=CANCELLED"
          className="tabular text-xs text-muted transition-colors hover:text-halt"
        >
          {number(cancelled)} cancelled
        </Link>
      </div>

      <div className="grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
        {PIPELINE.map((status, index) => (
          <Stage
            key={status}
            status={status}
            count={counts[status] ?? 0}
            loading={loading}
            isLast={index === PIPELINE.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function Stage({
  status,
  count,
  loading,
  isLast,
}: {
  status: BookingStatus;
  count: number;
  loading?: boolean;
  isLast: boolean;
}) {
  const style = BOOKING_STATUS[status];

  return (
    <Link
      href={`/bookings?status=${status}`}
      className="group relative border-b border-line px-5 py-4 transition-colors hover:bg-raised lg:border-b-0"
    >
      <div className="flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full', style.dot, !isLast && 'animate-pulse-dot')} />
        <span className="text-xs font-medium text-muted">{style.label}</span>
      </div>

      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p className="tabular mt-1.5 font-display text-[28px] font-bold leading-none tracking-tight">
          {number(count)}
        </p>
      )}

      {/* Work flows toward the next stage; the moving tick makes that literal. */}
      {!isLast ? (
        <span className="pointer-events-none absolute -right-px top-1/2 hidden h-6 w-px -translate-y-1/2 overflow-hidden bg-line lg:block">
          <span className={cn('block h-full w-full animate-flow-right', style.dot)} />
        </span>
      ) : null}
    </Link>
  );
}
