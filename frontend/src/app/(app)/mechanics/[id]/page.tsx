'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, MapPin, Phone, Star } from 'lucide-react';
import { useMechanic } from '@/hooks/use-queries';
import { dateTime, money, number } from '@/lib/format';
import { CATEGORY_LABEL } from '@/lib/status';
import { ErrorState, Panel, PanelHead, Skeleton } from '@/components/ui/primitives';
import { MechanicPill, StatusPill } from '@/components/ui/status-pill';

export default function MechanicDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isPending, isError, error, refetch } = useMechanic(params.id);

  if (isError) {
    return (
      <Panel>
        <ErrorState
          title="This mechanic could not be opened"
          message={error instanceof Error ? error.message : 'The record may have been removed.'}
          onRetry={() => refetch()}
        />
      </Panel>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight">{data.name}</h1>
            <MechanicPill status={data.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {data.city}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {data.phone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {data.email}
            </span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-sm">
          <Star className="h-3.5 w-3.5 fill-signal text-signal" />
          <span className="tabular font-semibold">{data.rating.toFixed(1)}</span>
          <span className="text-xs text-muted">rating</span>
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Jobs completed" value={number(data.stats.completedJobs)} />
        <Metric label="Total jobs" value={number(data.stats.totalJobs)} />
        <Metric label="Revenue closed" value={money(data.stats.revenue)} />
        <Metric label="Cancelled" value={number(data.stats.cancelledJobs)} />
        <Metric label="Avg turnaround" value={`${data.stats.avgTurnaroundHours}h`} />
      </div>

      <Panel>
        <PanelHead
          title="Recent jobs"
          description={`Specialises in ${CATEGORY_LABEL[data.specialisation] ?? data.specialisation}`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Booking</th>
                <th className="px-5 py-2.5 font-medium">Customer</th>
                <th className="px-5 py-2.5 font-medium">Service</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {data.recentBookings.map((booking) => (
                <tr key={booking.id} className="row-link border-b border-line last:border-0">
                  <td className="px-5 py-2.5">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="tabular font-medium text-signal hover:underline"
                    >
                      {booking.reference}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5">{booking.customerName}</td>
                  <td className="px-5 py-2.5">{booking.serviceName}</td>
                  <td className="px-5 py-2.5">
                    <StatusPill status={booking.status} />
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-medium">
                    {money(booking.amount)}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-muted">{dateTime(booking.scheduledAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular mt-1.5 font-display text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
