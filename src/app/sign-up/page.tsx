"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "", orgName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-primary opacity-[0.08] blur-3xl" />
      </div>

      <main id="main-content" className="relative z-10 w-full max-w-md">
        <div className="rounded-lg border border-border bg-card/80 p-8 backdrop-blur-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Create your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Start your EU AI Act compliance journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-foreground/80">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Jane Müller"
                className="w-full rounded-lg border border-input bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="org-name" className="mb-2 block text-sm font-medium text-foreground/80">
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                value={form.orgName}
                onChange={(e) => update("orgName", e.target.value)}
                placeholder="Acme GmbH"
                className="w-full rounded-lg border border-input bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground/80">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@company.eu"
                className="w-full rounded-lg border border-input bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground/80">
                Password <span className="font-normal text-muted-foreground">(min 8 characters)</span>
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-input bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Creating account...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-border pt-6">
            <a
              href="/sign-in"
              className="flex items-center justify-center gap-2 text-sm font-medium text-primary transition-colors duration-200 hover:text-primary/80"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Already have an account? Sign in
            </a>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By signing up you agree that this platform provides compliance tooling,
            not legal advice.
          </p>
        </div>
      </main>
    </div>
  );
}
