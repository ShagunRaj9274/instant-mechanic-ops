import { format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

export const money = (value: number) => inr.format(value ?? 0);

/** Revenue tiles read better as ₹18.6L than as ₹18,57,796. */
export const moneyCompact = (value: number) => `₹${compact.format(value ?? 0)}`;

export const number = (value: number) => new Intl.NumberFormat('en-IN').format(value ?? 0);

export function dateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
  return format(date, 'd MMM, h:mm a');
}

export const dayLabel = (value: string) => format(new Date(value), 'd MMM');

export function relative(value: string | Date | null | undefined) {
  if (!value) return '—';
  return `${formatDistanceToNowStrict(new Date(value))} ago`;
}

export const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
