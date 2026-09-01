'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-display text-lg font-semibold">The console hit an error</h1>
      <p className="max-w-md text-sm text-muted">
        {error.message || 'Something failed while rendering this page.'}
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-control bg-signal px-4 py-2 text-sm font-medium text-[#1a1206]"
      >
        Reload this page
      </button>
    </main>
  );
}
