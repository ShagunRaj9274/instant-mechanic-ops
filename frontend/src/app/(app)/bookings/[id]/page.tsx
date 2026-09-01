'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Car, MapPin, Phone, User, Wrench } from 'lucide-react';
import { useBooking, useMechanics } from '@/hooks/use-queries';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ApiError, patch } from '@/lib/api';
import { dateTime, money, relative } from '@/lib/format';
import { BOOKING_STATUS, CATEGORY_LABEL, NEXT_STATUS, type BookingStatus } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button, ErrorState, Panel, PanelHead, Skeleton } from '@/components/ui/primitives';
import { StatusPill } from '@/components/ui/status-pill';
import type { BookingDetail } from '@/lib/types';

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { data, isPending, isError, error, refetch } = useBooking(id);
  const { canWrite } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: availableMechanics } = useMechanics({
    page: 1,
    limit: 50,
    status: 'AVAILABLE',
    sortBy: 'name',
  });

  const move = useMutation({
    mutationFn: async (input: { status: BookingStatus; mechanicId?: string }) =>
      (await patch<BookingDetail>(`/api/v1/bookings/${id}/status`, input)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['booking', id], updated);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        tone: 'success',
        title: `${updated.reference} is now ${BOOKING_STATUS[updated.status].label.toLowerCase()}`,
        description: 'Every open console just received the update.',
      });
    },
    onError: (caught) => {
      toast({
        tone: 'error',
        title: 'The status did not change',
        description: caught instanceof ApiError ? caught.message : 'Try again in a moment.',
      });
    },
  });

  if (isError) {
    return (
      <Panel>
        <ErrorState
          title="This booking could not be opened"
          message={error instanceof Error ? error.message : 'It may have been removed.'}
          onRetry={() => refetch()}
        />
      </Panel>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  const nextMoves = NEXT_STATUS[data.status];

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
            <h1 className="tabular font-display text-2xl font-bold tracking-tight">
              {data.reference}
            </h1>
            <StatusPill status={data.status} pulse />
          </div>
          <p className="mt-1 text-sm text-muted">
            {data.service.name} · booked {relative(data.createdAt)} · {money(data.amount)}
          </p>
        </div>

        {canWrite && nextMoves.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {nextMoves.map((status) => {
              const needsMechanic = status === 'ASSIGNED' && !data.mechanic;
              const firstFree = availableMechanics?.data?.[0];
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={status === 'CANCELLED' ? 'danger' : 'primary'}
                  disabled={move.isPending || (needsMechanic && !firstFree)}
                  onClick={() =>
                    move.mutate({
                      status,
                      ...(needsMechanic && firstFree ? { mechanicId: firstFree.id } : {}),
                    })
                  }
                >
                  {status === 'CANCELLED'
                    ? 'Cancel job'
                    : needsMechanic && firstFree
                      ? `Assign ${firstFree.name.split(' ')[0]}`
                      : `Mark ${BOOKING_STATUS[status].label.toLowerCase()}`}
                </Button>
              );
            })}
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <Panel>
            <PanelHead title="Job details" />
            <dl className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
              <Detail icon={<User className="h-3.5 w-3.5" />} label="Customer">
                <Link
                  href={`/customers?search=${encodeURIComponent(data.customer.name)}`}
                  className="font-medium hover:text-signal hover:underline"
                >
                  {data.customer.name}
                </Link>
                <p className="tabular mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <Phone className="h-3 w-3" />
                  {data.customer.phone}
                </p>
              </Detail>

              <Detail icon={<Car className="h-3.5 w-3.5" />} label="Vehicle">
                <p className="font-medium">
                  {data.vehicle.make} {data.vehicle.model} · {data.vehicle.year}
                </p>
                <p className="tabular mt-0.5 text-xs text-muted">{data.vehicle.registration}</p>
              </Detail>

              <Detail icon={<Wrench className="h-3.5 w-3.5" />} label="Mechanic">
                {data.mechanic ? (
                  <Link
                    href={`/mechanics/${data.mechanic.id}`}
                    className="font-medium hover:text-signal hover:underline"
                  >
                    {data.mechanic.name}
                  </Link>
                ) : (
                  <p className="text-muted">Not assigned yet</p>
                )}
                <p className="mt-0.5 text-xs text-muted">
                  {CATEGORY_LABEL[data.service.category] ?? data.service.category} ·{' '}
                  {data.service.durationMinutes} min
                </p>
              </Detail>

              <Detail icon={<MapPin className="h-3.5 w-3.5" />} label="Where">
                <p className="font-medium">{data.address}</p>
                <p className="mt-0.5 text-xs text-muted">Scheduled {dateTime(data.scheduledAt)}</p>
              </Detail>
            </dl>

            {data.notes ? (
              <p className="border-t border-line px-5 py-3 text-sm text-muted">
                <span className="font-medium text-ink">Note from the customer: </span>
                {data.notes}
              </p>
            ) : null}
          </Panel>

          <Panel>
            <PanelHead title="Billing" />
            <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
              <Figure label="Amount" value={money(data.amount)} />
              <Figure label="Service" value={data.service.name} small />
              <Figure label="Completed" value={data.completedAt ? dateTime(data.completedAt) : '—'} small />
              <Figure label="City" value={data.city} small />
            </div>
          </Panel>
        </div>

        <Panel className="flex flex-col">
          <PanelHead title="Timeline" description="Every status change, in order" />
          <ol className="flex-1 p-5">
            {data.timeline.map((event, index) => {
              const style = BOOKING_STATUS[event.toStatus];
              const isLast = index === data.timeline.length - 1;
              return (
                <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {!isLast ? (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-line" aria-hidden />
                  ) : null}
                  <span
                    className={cn(
                      'relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-surface',
                      style.dot,
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{style.label}</p>
                    <p className="text-xs text-muted">
                      {dateTime(event.createdAt)} · {event.actor}
                    </p>
                    {event.note ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted">{event.note}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon}
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Figure({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          'tabular mt-1 font-display font-semibold',
          small ? 'text-sm' : 'text-xl tracking-tight',
        )}
      >
        {value}
      </p>
    </div>
  );
}
