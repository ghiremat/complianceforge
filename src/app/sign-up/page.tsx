"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft, Clock } from "lucide-react";
import { daysUntil } from "@/lib/utils";

const ENFORCEMENT_DATE = "2026-08-02";

type FieldErrors = Partial<Record<"email" | "password", string>>;

function isValidEmail(value: string) {
  const v = value.trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "", orgName: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const daysLeft = daysUntil(ENFORCEMENT_DATE);

  const fieldErrors = useMemo((): FieldErrors => {
    const e: FieldErrors = {};
    if (touched.email && !isValidEmail(form.email)) {
      e.email = "Enter a valid email address.";
    }
    if (touched.password && form.password.length > 0 && form.password.length < 8) {
      e.password = "Use at least 8 characters.";
    }
    return e;
  }, [form.email, form.password, touched.email, touched.password]);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function blurField(field: keyof typeof form) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setTouched({ email: true, password: true });

    if (!isValidEmail(form.email)) {
      setError("Please fix the errors below.");
      return;
    }
    if (form.password.length < 8) {
      setError("Please fix the errors below.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.name.trim() || undefined,
          orgName: form.orgName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      router.push("/sign-in?registered=1");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#0a0a0f] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-indigo-600 opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-indigo-500 opacity-[0.08] blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-indigo-500/50 opacity-[0.06] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10">
        <nav className="mb-8 flex items-center justify-between">
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
          <div className="inline-flex items-center gap-2 rounded-full border border-red-900 bg-red-950/70 px-3 py-1.5 text-xs font-medium text-red-300">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{daysLeft}d to Aug 2, 2026</span>
          </div>
        </nav>

        <main id="main-content" className="flex flex-1 flex-col justify-center pb-8">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-sm">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-indigo-600">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-white">Create your account</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Register to manage AI system inventory, documentation, and compliance checks. Not legal
                advice—review outputs with your own experts.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-300">
                  Full name <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Jane Müller"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 transition-colors duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="org-name" className="mb-2 block text-sm font-medium text-slate-300">
                  Organization <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={form.orgName}
                  onChange={(e) => update("orgName", e.target.value)}
                  placeholder="Acme GmbH"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 transition-colors duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  onBlur={() => blurField("email")}
                  placeholder="you@company.eu"
                  required
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 transition-colors duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 aria-invalid:border-red-800"
                />
                {fieldErrors.email && (
                  <p id="email-error" className="mt-1.5 text-xs text-red-400" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                  Password <span className="font-normal text-slate-500">(min. 8 characters)</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  onBlur={() => blurField("password")}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 transition-colors duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 aria-invalid:border-red-800"
                />
                {fieldErrors.password && (
                  <p id="password-error" className="mt-1.5 text-xs text-red-400" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 font-semibold text-white transition-colors duration-200 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Create account
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-800 pt-6">
              <a
                href="/sign-in"
                className="flex items-center justify-center gap-2 text-sm font-medium text-indigo-400 transition-colors duration-200 hover:text-indigo-300"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Already have an account? Sign in
              </a>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
              By signing up you agree that this platform provides compliance tooling, not legal advice.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
