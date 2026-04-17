"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  Clock,
  GitBranch,
  Sparkles,
  FileText,
  Globe,
  Network,
} from "lucide-react";
import { daysUntil } from "@/lib/utils";

const ENFORCEMENT_DATE = "2026-08-02";

const FEATURES = [
  { icon: Shield, label: "EU AI Act risk classification" },
  { icon: FileText, label: "Automated Annex IV documentation" },
  { icon: GitBranch, label: "CI/CD compliance checks" },
  { icon: Globe, label: "Public compliance passport" },
  { icon: Network, label: "REST API for pipeline integration" },
] as const;

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const daysLeft = daysUntil(ENFORCEMENT_DATE);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#0a0a0f] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-indigo-600 opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-indigo-500 opacity-[0.08] blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 h-96 w-96 rounded-full bg-indigo-500/60 opacity-[0.08] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                ComplianceForge<span className="text-indigo-400">.ai</span>
              </p>
              <p className="text-xs text-slate-500">EU AI Act Platform</p>
            </div>
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
            <a
              href="https://github.com/gengirish/complianceforge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-1 rounded outline-none transition-colors duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
            >
              <GitBranch className="h-4 w-4" /> GitHub
            </a>
          </div>
        </nav>

        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-red-900 bg-red-950/80 px-4 py-2 text-sm font-medium text-red-300">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{daysLeft} days until August 2, 2026 enforcement deadline</span>
            </div>

            <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
              EU AI Act compliance tooling for{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                teams and pipelines
              </span>
            </h1>

            <p className="mb-10 max-w-xl text-sm leading-relaxed text-slate-400">
              ComplianceForge helps you inventory AI systems, document obligations under the EU AI Act,
              and surface gaps early. Classification is{" "}
              <span className="text-slate-300">AI-assisted</span> (via OpenRouter); outputs should be
              reviewed by qualified personnel—this product is not legal advice.
            </p>

            <div className="mb-10 space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Includes</p>
              <ul className="space-y-3">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-start gap-3 text-sm text-slate-200">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" aria-hidden />
                AI-powered classification; model routing is handled by OpenRouter.
              </p>
            </div>

            <p className="text-center text-xs text-slate-600 lg:text-left">
              BuildwithAiGiri Series — by Girish B. Hiremath | intelliforge.digital
            </p>
          </div>

          <main id="main-content" className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-sm">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-indigo-600">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
                  <p className="mt-1 text-sm text-slate-400">Sign in to your compliance dashboard</p>
                </div>

                {registered && (
                  <div className="mb-6 rounded-lg border border-green-900/60 bg-green-950/40 p-4">
                    <p className="text-sm font-medium text-green-300">Account created successfully</p>
                    <p className="text-xs text-green-400/90">Sign in with your new credentials below.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                      Work Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.eu"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 transition-colors duration-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 transition-colors duration-200 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 font-semibold text-white outline-none transition-all duration-200 hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        Sign In
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 border-t border-slate-800 pt-6 text-center">
                  <p className="text-sm text-slate-400">
                    Don&apos;t have an account?{" "}
                    <Link
                      href="/sign-up"
                      className="cursor-pointer rounded font-medium text-indigo-400 outline-none transition-colors duration-200 hover:text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
                    >
                      Create one
                    </Link>
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    EU AI Act enforcement:{" "}
                    <span className="font-semibold text-red-400">August 2, 2026</span>
                    {" — "}
                    {daysLeft} days remaining
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-slate-400">
          <span className="h-8 w-8 motion-safe:animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
