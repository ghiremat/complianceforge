"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl">⚠</div>
        <h1 className="mb-2 text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mb-6 text-slate-400">
          An unexpected error occurred. Our team has been notified.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-slate-600">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
