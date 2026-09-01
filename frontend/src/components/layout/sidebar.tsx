'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, LayoutDashboard, Users, Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/bookings', label: 'Bookings', icon: ClipboardList },
  { href: '/mechanics', label: 'Mechanics', icon: Wrench },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-line bg-surface',
          'transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-line px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-signal text-[#1a1206]">
              <Wrench className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="font-display text-[15px] font-bold leading-none tracking-tight">
              Instant Mechanic
              <span className="mt-1 block text-[10px] font-medium tracking-wide text-muted">
                Operations console
              </span>
            </span>
          </Link>
          <button
            className="rounded p-1 text-muted hover:text-ink lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-signal/12 font-medium text-signal'
                    : 'text-muted hover:bg-raised hover:text-ink',
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/docs`}
            target="_blank"
            rel="noreferrer"
            className="block rounded-control border border-line px-3 py-2.5 text-xs text-muted transition-colors hover:border-signal/40 hover:text-ink"
          >
            <span className="block font-medium text-ink">API reference</span>
            Swagger docs for this dashboard
          </a>
        </div>
      </aside>
    </>
  );
}
