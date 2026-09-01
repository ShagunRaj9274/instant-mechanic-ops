'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { describeEvent, useRealtime } from '@/hooks/use-realtime';
import { initials, relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/ui/status-pill';

const CONNECTION = {
  live: { label: 'Live', dot: 'bg-go', text: 'text-go' },
  connecting: { label: 'Connecting', dot: 'bg-signal', text: 'text-signal' },
  offline: { label: 'Reconnecting', dot: 'bg-halt', text: 'text-halt' },
} as const;

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, signOut } = useAuth();
  const { state, events, unread, markRead } = useRealtime();
  const [openPanel, setOpenPanel] = useState<'none' | 'bell' | 'user'>('none');
  const [term, setTerm] = useState('');
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpenPanel('none');
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const connection = CONNECTION[state];

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md">
      <button
        className="rounded p-1.5 text-muted hover:bg-raised hover:text-ink lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      <form
        className="relative hidden max-w-sm flex-1 sm:block"
        onSubmit={(event) => {
          event.preventDefault();
          if (term.trim()) router.push(`/bookings?search=${encodeURIComponent(term.trim())}`);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search bookings, customers, registrations"
          className="field w-full pl-9"
          aria-label="Search bookings"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5" ref={shellRef}>
        <span
          className={cn(
            'hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium sm:inline-flex',
            connection.text,
          )}
          title={`Realtime connection: ${connection.label}`}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', connection.dot, state === 'live' && 'animate-pulse-dot')} />
          {connection.label}
        </span>

        <div className="relative">
          <button
            className="relative rounded-control p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
            onClick={() => {
              setOpenPanel(openPanel === 'bell' ? 'none' : 'bell');
              markRead();
            }}
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="tabular absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[10px] font-bold text-[#1a1206]">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </button>

          {openPanel === 'bell' ? (
            <div className="absolute right-0 top-11 w-[320px] animate-slide-in overflow-hidden rounded-card border border-line bg-surface shadow-pop">
              <div className="border-b border-line px-4 py-2.5">
                <p className="text-sm font-medium">Live activity</p>
                <p className="text-xs text-muted">Pushed over the socket as jobs move</p>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {events.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-muted">
                    Nothing yet. Updates appear here the moment a job changes.
                  </p>
                ) : (
                  events.slice(0, 12).map((event) => (
                    <Link
                      key={event.id}
                      href={`/bookings/${event.bookingId}`}
                      onClick={() => setOpenPanel('none')}
                      className="row-link flex items-start gap-3 border-b border-line px-4 py-2.5 last:border-0"
                    >
                      <StatusPill status={event.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {event.reference} · {event.customer}
                        </p>
                        <p className="truncate text-[11px] text-muted">
                          {describeEvent(event)} · {relative(event.at)}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <button
          className="rounded-control p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Switch colour theme"
        >
          {mounted && resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <div className="relative">
          <button
            className="flex items-center gap-2 rounded-control p-1 pr-2 transition-colors hover:bg-raised"
            onClick={() => setOpenPanel(openPanel === 'user' ? 'none' : 'user')}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal/15 text-[11px] font-semibold text-signal">
              {initials(user?.name ?? 'Ops')}
            </span>
            <span className="hidden text-left text-xs leading-tight sm:block">
              <span className="block font-medium">{user?.name}</span>
              <span className="block text-[10px] text-muted">{user?.role}</span>
            </span>
          </button>

          {openPanel === 'user' ? (
            <div className="absolute right-0 top-11 w-56 animate-slide-in overflow-hidden rounded-card border border-line bg-surface shadow-pop">
              <div className="border-b border-line px-4 py-3">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
              <button
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-muted transition-colors hover:bg-raised hover:text-ink"
                onClick={signOut}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
