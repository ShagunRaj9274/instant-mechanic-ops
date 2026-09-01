'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, readToken } from '@/lib/api';
import { BOOKING_STATUS } from '@/lib/status';
import type { Booking } from '@/lib/types';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

export type ConnectionState = 'connecting' | 'live' | 'offline';

export interface LiveEvent {
  id: string;
  kind: 'created' | 'updated';
  reference: string;
  bookingId: string;
  customer: string;
  status: Booking['status'];
  mechanic: string | null;
  at: string;
}

interface RealtimeContextValue {
  state: ConnectionState;
  events: LiveEvent[];
  unread: number;
  markRead: () => void;
  lastEventAt: string | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  state: 'connecting',
  events: [],
  unread: 0,
  markRead: () => {},
  lastEventAt: null,
});

/**
 * A single socket for the whole app. Incoming events do two things: they push
 * an entry into the notification rail, and they invalidate the React Query
 * caches so any table or chart on screen refetches itself. No page reloads,
 * and no polling loop competing with the socket.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [state, setState] = useState<ConnectionState>('connecting');
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  // Refetching on every single event would thrash the API during a busy hour.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const token = readToken();
    if (!user || !token) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
    socketRef.current = socket;

    const scheduleRefresh = () => {
      if (refreshTimer.current) return;
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['mechanics'] });
      }, 900);
    };

    const record = (kind: LiveEvent['kind'], booking: Booking, at: string) => {
      setEvents((current) =>
        [
          {
            id: `${booking.id}-${at}`,
            kind,
            bookingId: booking.id,
            reference: booking.reference,
            customer: booking.customer?.name ?? 'Customer',
            status: booking.status,
            mechanic: booking.mechanic?.name ?? null,
            at,
          },
          ...current,
        ].slice(0, 30),
      );
      setUnread((count) => count + 1);
      scheduleRefresh();
    };

    socket.on('connect', () => setState('live'));
    socket.on('disconnect', () => setState('offline'));
    socket.on('connect_error', () => setState('offline'));
    socket.io.on('reconnect_attempt', () => setState('connecting'));

    socket.on('booking:created', ({ booking, at }: { booking: Booking; at: string }) => {
      record('created', booking, at);
    });

    socket.on('booking:updated', ({ booking, at }: { booking: Booking; at: string }) => {
      record('updated', booking, at);
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      // Only the endings are worth interrupting an operator for.
      if (booking.status === 'CANCELLED') {
        toast({
          tone: 'error',
          title: `${booking.reference} cancelled`,
          description: `${booking.customer?.name ?? 'Customer'} · ${booking.city}`,
        });
      }
    });

    socket.on('mechanic:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['mechanics'] });
    });

    socket.on('dashboard:stats', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, queryClient, toast]);

  const value = useMemo(
    () => ({
      state,
      events,
      unread,
      markRead: () => setUnread(0),
      lastEventAt: events[0]?.at ?? null,
    }),
    [state, events, unread],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);

export const describeEvent = (event: LiveEvent) =>
  event.kind === 'created'
    ? 'New booking received'
    : `Moved to ${BOOKING_STATUS[event.status].label.toLowerCase()}`;
