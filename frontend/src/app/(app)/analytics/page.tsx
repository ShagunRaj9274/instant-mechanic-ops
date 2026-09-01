'use client';

import { useState } from 'react';
import { useDashboard } from '@/hooks/use-queries';
import { money, moneyCompact, number } from '@/lib/format';
import { CATEGORY_LABEL } from '@/lib/status';
import {
  BookingsTrend,
  CategoryBars,
  CityBars,
  RevenueTrend,
  StatusDonut,
} from '@/components/dashboard/charts';
import { ErrorState, Panel, PanelHead } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isPending, isError, error, refetch } = useDashboard(days);

  if (isError) {
    return (
      <Panel>
        <ErrorState
          message={error instanceof Error ? error.message : 'Analytics did not load.'}
          onRetry={() => refetch()}
        />
      </Panel>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            How volume, revenue and service mix are moving
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-control border border-line p-0.5">
          {RANGES.map((range) => (
            <button
              key={range.days}
              onClick={() => setDays(range.days)}
              className={cn(
                'rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors',
                days === range.days ? 'bg-signal/15 text-signal' : 'text-muted hover:text-ink',
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure label="Revenue" value={moneyCompact(summary?.totalRevenue ?? 0)} note="all time" />
        <Figure label="Average ticket" value={money(summary?.averageTicket ?? 0)} note="per completed job" />
        <Figure label="Completion rate" value={`${summary?.completionRate ?? 0}%`} note="of all bookings" />
        <Figure label="Cancellation rate" value={`${summary?.cancellationRate ?? 0}%`} note="of all bookings" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel>
          <PanelHead title="Bookings over time" description={`Daily volume across ${days} days`} />
          <div className="p-3">
            <BookingsTrend data={data?.timeseries ?? []} loading={isPending} />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Revenue over time" description="Collected from completed jobs" />
          <div className="p-3">
            <RevenueTrend data={data?.timeseries ?? []} loading={isPending} />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Booking status" description="Where every job in the system sits" />
          <div className="p-3">
            <StatusDonut data={data?.statusBreakdown ?? []} loading={isPending} />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Service categories" description="Volume by category" />
          <div className="p-3">
            <CategoryBars data={data?.serviceBreakdown ?? []} loading={isPending} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <PanelHead title="Revenue by city" description="Where the money is coming from" />
          <div className="p-3">
            <CityBars data={data?.cities ?? []} loading={isPending} />
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Category economics" description="Average ticket against volume" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">Category</th>
                  <th className="px-5 py-2.5 text-right font-medium">Bookings</th>
                  <th className="px-5 py-2.5 text-right font-medium">Avg ticket</th>
                  <th className="px-5 py-2.5 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(data?.serviceBreakdown ?? []).map((row) => (
                  <tr key={row.category} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5">{CATEGORY_LABEL[row.category] ?? row.category}</td>
                    <td className="tabular px-5 py-2.5 text-right">{number(row.bookings)}</td>
                    <td className="tabular px-5 py-2.5 text-right">{money(row.averageTicket)}</td>
                    <td className="tabular px-5 py-2.5 text-right font-medium">
                      {money(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular mt-1.5 font-display text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}
