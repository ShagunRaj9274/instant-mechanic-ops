'use client';

import Link from 'next/link';
import { Radio } from 'lucide-react';
import { useRealtime } from '@/hooks/use-realtime';
import { relative } from '@/lib/format';
import { BOOKING_STATUS } from '@/lib/status';
import type { ActivityItem } from '@/lib/types';
import { EmptyState, Panel, PanelHead, Skeleton } from '@/components/ui/primitives';
import { StatusPill } from '@/components/ui/status-pill';

/**
 * Merges the socket stream with the last events from the API, so the rail is
 * populated on first paint and then keeps moving on its own.
 */
export function ActivityFeed({ items, loading }: { items: ActivityItem[]; loading?: boolean }) {
  const { events, state } = useRealtime();

  const merged = [
    ...events.map((event) => ({
      id: event.id,
      bookingId: event.bookingId,
      reference: event.reference,
      customerName: event.customer,
      mechanicName: event.mechanic,
      toStatus: event.status,
      createdAt: event.at,
      live: true,
    })),
    ...items.map((item) => ({
      id: item.id,
      bookingId: item.bookingId,
      reference: item.reference,
      customerName: item.customerName,
      mechanicName: item.mechanicName,
      toStatus: item.toStatus,
      createdAt: item.createdAt,
      live: false,
    })),
  ]
    .filter(
      (item, index, all) => all.findIndex((other) => other.id === item.id) === index,
    )
    .slice(0, 14);

  return (
    <Panel className="flex h-full flex-col">
      <PanelHead
        title="Live activity"
        description={state === 'live' ? 'Streaming over the socket' : 'Waiting for the connection'}
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : merged.length === 0 ? (
          <EmptyState
            icon={<Radio className="h-5 w-5" />}
            title="The board is quiet"
            description="Status changes show up here the moment a mechanic or customer acts."
          />
        ) : (
          <ol>
            {merged.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/bookings/${item.bookingId}`}
                  className="row-link flex items-start gap-3 border-b border-line px-4 py-3 last:border-0"
                >
                  <StatusPill status={item.toStatus} pulse={item.live} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {item.reference} · {item.customerName}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {item.mechanicName ?? 'Unassigned'} · {relative(item.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  );
}

export const statusLabel = (status: keyof typeof BOOKING_STATUS) => BOOKING_STATUS[status].label;
