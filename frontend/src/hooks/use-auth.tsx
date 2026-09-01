'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { post, readToken, writeToken } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

const USER_KEY = 'im.ops.user';

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  canWrite: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  signIn: async () => {},
  signOut: () => {},
  canWrite: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  // Restore the session from storage before the first paint of a guarded page.
  useEffect(() => {
    const token = readToken();
    const cached = window.localStorage.getItem(USER_KEY);
    if (token && cached) {
      try {
        setUser(JSON.parse(cached) as AuthUser);
      } catch {
        writeToken(null);
      }
    }
    setReady(true);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data } = await post<{ token: string; user: AuthUser }>('/api/v1/auth/login', {
      email,
      password,
    });
    writeToken(data.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const signOut = useCallback(() => {
    writeToken(null);
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
    router.push('/login');
  }, [router]);

  const value = useMemo(
    () => ({ user, ready, signIn, signOut, canWrite: user?.role !== 'VIEWER' }),
    [user, ready, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
