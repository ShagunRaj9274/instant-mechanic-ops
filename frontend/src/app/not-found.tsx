import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-display text-5xl font-bold text-signal">404</p>
      <h1 className="font-display text-lg font-semibold">This page is not on the board</h1>
      <p className="max-w-sm text-sm text-muted">
        The link may be out of date. Head back to the overview to pick up where you left off.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-control bg-signal px-4 py-2 text-sm font-medium text-[#1a1206]"
      >
        Back to overview
      </Link>
    </main>
  );
}
