import {
  BOOKING_STATUS,
  MECHANIC_STATUS,
  type BookingStatus,
  type MechanicStatus,
} from '@/lib/status';
import { cn } from '@/lib/utils';

export function StatusPill({
  status,
  className,
  pulse = false,
}: {
  status: BookingStatus;
  className?: string;
  pulse?: boolean;
}) {
  const style = BOOKING_STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        style.pill,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot, pulse && 'animate-pulse-dot')} />
      {style.label}
    </span>
  );
}

export function MechanicPill({ status }: { status: MechanicStatus }) {
  const style = MECHANIC_STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        style.pill,
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', style.dot, status === 'ON_JOB' && 'animate-pulse-dot')}
      />
      {style.label}
    </span>
  );
}
