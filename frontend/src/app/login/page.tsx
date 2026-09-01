'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowRight, Wrench } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';

const DEMO_ACCOUNTS = [
  { role: 'Operations', email: 'ops@instantmechanic.com', note: 'Dispatch and update jobs' },
  { role: 'Admin', email: 'admin@instantmechanic.com', note: 'Full access' },
  { role: 'Viewer', email: 'viewer@instantmechanic.com', note: 'Read only' },
];

function LoginForm() {
  const { signIn, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('ops@instantmechanic.com');
  const [password, setPassword] = useState('instant123');
  const [error, setError] = useState<string | null>(
    params.get('expired') ? 'Your session expired. Sign in again.' : null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/');
  }, [ready, user, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Sign in failed. Try again in a moment.',
      );
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Left panel doubles as the product pitch: what this console is for. */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-[#1a1206]">
            <Wrench className="h-4.5 w-4.5" strokeWidth={2.4} />
          </span>
          <span className="font-display text-base font-bold tracking-tight">Instant Mechanic</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-[34px] font-bold leading-[1.15] tracking-tight">
            Every job on the board, the second it moves.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            The operations console tracks bookings from the moment a customer taps confirm to the
            moment a mechanic closes the job — pending, assigned, on the way, in progress, done.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-6">
            {[
              { value: '680+', label: 'Bookings in the demo dataset' },
              { value: '26', label: 'Mechanics across six cities' },
              { value: 'Live', label: 'Updates over WebSockets' },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="font-display text-xl font-bold text-signal">{stat.value}</dt>
                <dd className="mt-1 text-xs leading-snug text-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-xs text-muted">Built for the Instant Mechanic engineering assignment.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-[#1a1206]">
              <Wrench className="h-4.5 w-4.5" strokeWidth={2.4} />
            </span>
            <span className="font-display text-base font-bold tracking-tight">Instant Mechanic</span>
          </div>

          <h2 className="font-display text-xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use a demo account to open the console.</p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted">
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field w-full"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field w-full"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-control border border-halt/30 bg-halt/10 px-3 py-2 text-xs text-halt"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-signal text-sm font-semibold text-[#1a1206] transition-[filter] hover:brightness-105 disabled:opacity-60"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a1206]/30 border-t-[#1a1206]" />
              ) : (
                <>
                  Open the console
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-card border border-line bg-surface p-4">
            <p className="text-xs font-medium">Demo accounts</p>
            <p className="mt-0.5 text-[11px] text-muted">
              Password for all three is <span className="font-medium text-ink">instant123</span>
            </p>
            <div className="mt-3 space-y-1">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('instant123');
                  }}
                  className="flex w-full items-center justify-between rounded-control px-2 py-1.5 text-left transition-colors hover:bg-raised"
                >
                  <span className="text-xs">
                    <span className="font-medium">{account.role}</span>
                    <span className="ml-2 text-muted">{account.note}</span>
                  </span>
                  <span className="text-[11px] text-muted">use</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
