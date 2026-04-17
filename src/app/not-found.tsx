import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="max-w-md text-center">
        <div className="mb-4 text-8xl font-bold text-indigo-500/20">404</div>
        <h1 className="mb-2 text-2xl font-bold text-white">Page not found</h1>
        <p className="mb-6 text-slate-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
