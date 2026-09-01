'use client';

import Link from 'next/link';
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  IndianRupee,
  Timer,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { useDashboard } from '@/hooks/use-queries';
import { money, moneyCompact, number, relative } from '@/lib/format';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Pipeline } from '@/components/dashboard/pipeline';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { BookingsTrend, CategoryBars, RevenueTrend } from '@/components/dashboard/charts';
import { ErrorState, Panel, PanelHead, Skeleton } from '@/components/ui/primitives';
import { MechanicPill } from '@/components/ui/status-pill';

export default function OverviewPage() {
  const { data, isPending, isError, error, refetch, dataUpdatedAt } = useDashboard(30);
  const summary = data?.summary;

  if (isError) {
    return (
      <Panel>
        <ErrorState
          title="The overview could not load"
          message={error instanceof Error ? error.message : 'The API did not respond.'}
          onRetry={() => refetch()}
        />
      </Panel>
    );
  }

  const counts = Object.fromEntries(
    (data?.statusBreakdown ?? []).map((item) => [item.status, item.count]),
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            {summary
              ? `${number(summary.todayBookings)} bookings scheduled today · ${money(summary.todayRevenue)} collected`
              : 'Loading the board…'}
          </p>
        </div>
        <p className="text-xs text-muted">
          Updated {dataUpdatedAt ? relative(new Date(dataUpdatedAt)) : 'just now'}
        </p>
      </header>

      <Pipeline counts={counts} cancelled={summary?.cancelledBookings ?? 0} loading={isPending} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total bookings"
          value={number(summary?.totalBookings ?? 0)}
          hint="all time"
          trend={summary?.trends.bookings}
          icon={<ClipboardList className="h-4 w-4" />}
          href="/bookings"
          loading={isPending}
        />
        <KpiCard
          label="Total revenue"
          value={moneyCompact(summary?.totalRevenue ?? 0)}
          hint={`avg ${money(summary?.averageTicket ?? 0)}`}
          trend={summary?.trends.revenue}
          icon={<IndianRupee className="h-4 w-4" />}
          accent="text-go"
          loading={isPending}
        />
        <KpiCard
          label="Today's bookings"
          value={number(summary?.todayBookings ?? 0)}
          hint={money(summary?.todayRevenue ?? 0) + ' today'}
          icon={<CalendarClock className="h-4 w-4" />}
          accent="text-route"
          loading={isPending}
        />
        <KpiCard
          label="Active mechanics"
          value={`${number(summary?.activeMechanics ?? 0)} / ${number(summary?.totalMechanics ?? 0)}`}
          hint="on shift now"
          icon={<Wrench className="h-4 w-4" />}
          href="/mechanics"
          loading={isPending}
        />
        <KpiCard
          label="Completed"
          value={number(summary?.completedBookings ?? 0)}
          hint={`${summary?.completionRate ?? 0}% completion rate`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="text-go"
          href="/bookings?status=COMPLETED"
          loading={isPending}
        />
        <KpiCard
          label="Pending"
          value={number(summary?.pendingBookings ?? 0)}
          hint="waiting for a mechanic"
          icon={<Timer className="h-4 w-4" />}
          href="/bookings?status=PENDING"
          loading={isPending}
        />
        <KpiCard
          label="Cancelled"
          value={number(summary?.cancelledBookings ?? 0)}
          hint={`${summary?.cancellationRate ?? 0}% of all jobs`}
          icon={<Ban className="h-4 w-4" />}
          accent="text-halt"
          href="/bookings?status=CANCELLED"
          loading={isPending}
        />
        <KpiCard
          label="New customers"
          value={number(summary?.newCustomers ?? 0)}
          hint="last 30 days"
          trend={summary?.trends.customers}
          icon={<UserPlus className="h-4 w-4" />}
          accent="text-queue"
          href="/customers"
          loading={isPending}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
        <Panel>
          <PanelHead
            title="Bookings over time"
            description="Daily volume against completed jobs, last 30 days"
          />
          <div className="p-3">
            <BookingsTrend data={data?.timeseries ?? []} loading={isPending} />
          </div>
        </Panel>

        <ActivityFeed items={data?.recentActivity ?? []} loading={isPending} />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
        <Panel>
          <PanelHead title="Revenue over time" description="Collected from completed jobs" />
          <div className="p-3">
            <RevenueTrend data={data?.timeseries ?? []} loading={isPending} />
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Busiest services"
            description="By booking volume"
            action={
              <Link href="/analytics" className="text-xs text-muted hover:text-ink">
                Analytics
              </Link>
            }
          />
          <div className="p-3">
            <CategoryBars data={data?.serviceBreakdown ?? []} loading={isPending} />
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHead
          title="Top mechanics"
          description="Ranked by revenue closed"
          action={
            <Link href="/mechanics" className="text-xs text-muted hover:text-ink">
              All mechanics
            </Link>
          }
        />
        <div className="divide-y divide-line">
          {isPending
            ? Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-5 py-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="ml-auto h-4 w-20" />
                </div>
              ))
            : (data?.topMechanics ?? []).map((mechanic, index) => (
                <Link
                  key={mechanic.id}
                  href={`/mechanics/${mechanic.id}`}
                  className="row-link flex flex-wrap items-center gap-3 px-5 py-3"
                >
                  <span className="tabular w-5 font-display text-sm font-semibold text-muted">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{mechanic.name}</span>
                  <MechanicPill status={mechanic.status} />
                  <span className="tabular ml-auto text-xs text-muted">
                    {number(mechanic.jobsCompleted)} jobs
                  </span>
                  <span className="tabular w-24 text-right text-sm font-medium">
                    {moneyCompact(mechanic.revenue)}
                  </span>
                </Link>
              ))}
        </div>
      </Panel>
    </div>
  );
}
