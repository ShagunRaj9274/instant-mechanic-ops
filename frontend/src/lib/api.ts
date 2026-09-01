export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export const TOKEN_KEY = 'im.ops.token';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: PageMeta;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type Query = Record<string, string | number | boolean | undefined | null>;

export function buildUrl(path: string, query?: Query) {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * One place where every request gets its token, its error shape and its
 * session-expiry handling. Components never touch fetch directly.
 */
export async function request<T>(
  path: string,
  options: RequestInit & { query?: Query } = {},
): Promise<Envelope<T>> {
  const { query, headers, ...rest } = options;
  const token = readToken();

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the operations API. Check your connection.');
  }

  if (response.status === 401) {
    writeToken(null);
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?expired=1';
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Your session expired. Sign in again.');
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'The request failed. Try again.',
      error?.details,
    );
  }

  return payload as Envelope<T>;
}

export const get = <T>(path: string, query?: Query) => request<T>(path, { query });

export const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

/** CSV download needs the raw response, so it bypasses the JSON envelope. */
export async function downloadCsv(path: string, query: Query, filename: string) {
  const response = await fetch(buildUrl(path, query), {
    headers: { Authorization: `Bearer ${readToken() ?? ''}` },
  });
  if (!response.ok) throw new ApiError(response.status, 'EXPORT_FAILED', 'The export could not be generated.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
