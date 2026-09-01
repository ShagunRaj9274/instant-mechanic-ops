'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PageMeta } from '@/lib/api';
import { number } from '@/lib/format';
import { Button } from './primitives';

export function Pagination({
  meta,
  onPage,
  onLimit,
  label = 'rows',
}: {
  meta: PageMeta;
  onPage: (page: number) => void;
  onLimit?: (limit: number) => void;
  label?: string;
}) {
  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="tabular text-xs text-muted">
        {number(first)}–{number(last)} of {number(meta.total)} {label}
      </p>
      <div className="flex items-center gap-2">
        {onLimit ? (
          <select
            className="field h-8 px-2 text-xs"
            value={meta.limit}
            onChange={(event) => onLimit(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        ) : null}
        <Button
          size="sm"
          onClick={() => onPage(meta.page - 1)}
          disabled={!meta.hasPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="tabular px-1 text-xs text-muted">
          {meta.page} / {meta.totalPages}
        </span>
        <Button
          size="sm"
          onClick={() => onPage(meta.page + 1)}
          disabled={!meta.hasNext}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
