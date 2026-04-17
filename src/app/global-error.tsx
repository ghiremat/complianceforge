"use client";

export default function RootError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="max-w-md text-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Critical Error</h1>
            <p className="mb-6 text-slate-400">
              Something went seriously wrong. Please try refreshing the page.
            </p>
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
