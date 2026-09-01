import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { verifyToken } from '../middleware/auth';

let io: Server | null = null;

/**
 * The dashboard opens one socket per browser tab. Clients join rooms so a
 * booking detail page only receives traffic for the booking it is showing.
 */
export function initRealtime(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.data.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('ops');
    logger.info(`Socket connected: ${socket.data.user?.email ?? 'unknown'} (${socket.id})`);

    socket.on('booking:subscribe', (bookingId: string) => {
      if (typeof bookingId === 'string') socket.join(`booking:${bookingId}`);
    });
    socket.on('booking:unsubscribe', (bookingId: string) => {
      if (typeof bookingId === 'string') socket.leave(`booking:${bookingId}`);
    });
    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIo(): Server | null {
  return io;
}

export function connectedClients(): number {
  return io?.engine?.clientsCount ?? 0;
}
