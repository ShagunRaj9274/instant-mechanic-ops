'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: Tone }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info } as const;

const TONES: Record<Tone, string> = {
  success: 'text-go',
  error: 'text-halt',
  info: 'text-route',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, tone = 'info' }: { title: string; description?: string; tone?: Tone }) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-3), { id, title, description, tone }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <div
              key={item.id}
              role="status"
              className="pointer-events-auto flex animate-slide-in items-start gap-3 rounded-card border border-line bg-surface p-3 shadow-pop"
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONES[item.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="rounded p-0.5 text-muted transition-colors hover:text-ink"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
