type Level = 'debug' | 'info' | 'warn' | 'error';

const COLORS: Record<Level, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

function write(level: Level, message: string, meta?: unknown) {
  const time = new Date().toISOString();
  const base = `${COLORS[level]}${level.toUpperCase()}\x1b[0m ${time} ${message}`;
  if (meta === undefined) console.log(base);
  else console.log(base, typeof meta === 'string' ? meta : JSON.stringify(meta));
}

export const logger = {
  debug: (m: string, meta?: unknown) => write('debug', m, meta),
  info: (m: string, meta?: unknown) => write('info', m, meta),
  warn: (m: string, meta?: unknown) => write('warn', m, meta),
  error: (m: string, meta?: unknown) => write('error', m, meta),
};
