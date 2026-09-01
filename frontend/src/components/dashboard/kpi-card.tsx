'use client';

import Link from 'next/link';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/primitives';

interface Props {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
  trend?: number;
  /** Set when a rising number is bad news, e.g. cancellations. */
  invertTrend?: boolean;
  href?: string;
  loading?: boolean;
  accent?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  hint,
  trend,
  invertTrend,
  href,
  loading,
  accent = 'text-signal',
}: Props) {
  const positive = trend === undefined ? null : invertTrend ? trend <= 0 : trend >= 0;

  const body = (
    <div className="panel h-full p-4 transition-colors hover:border-line/80 hover:bg-raised/40">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className={cn('opacity-80', accent)}>{icon}</span>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="tabular mt-2 font-display text-[26px] font-bold leading-none tracking-tight">
          {value}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {trend !== undefined && !loading ? (
          <span
            className={cn(
              'tabular inline-flex items-center gap-1 text-xs font-medium',
              positive ? 'text-go' : 'text-halt',
            )}
          >
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        ) : null}
        {hint ? <span className="truncate text-xs text-muted">{hint}</span> : null}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
