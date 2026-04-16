"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Clock, GitBranch, Zap, FileText, Calendar, Users, CheckCircle, X } from "lucide-react";
import { daysUntil } from "@/lib/utils";

const ENFORCEMENT_DATE = "2026-08-02";

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
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-primary/80 opacity-[0.08] blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 h-96 w-96 rounded-full bg-primary/60 opacity-[0.08] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                ComplianceForge<span className="text-primary">.ai</span>
              </p>
              <p className="text-xs text-muted-foreground">EU AI Act Platform</p>
            </div>
          </div>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a
              href="https://github.com/gengirish/complianceforge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors duration-200 hover:text-foreground"
            >
              <GitBranch className="h-4 w-4" /> GitHub
            </a>
          </div>
        </nav>

        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-red-800 bg-red-950 px-4 py-2 text-sm font-medium text-red-300">
              <Clock className="h-4 w-4" />
              <span>{daysLeft} days until August 2, 2026 enforcement deadline</span>
            </div>

            <h1 className="mb-6 text-5xl font-semibold leading-tight md:text-6xl">
              Enterprise EU AI Act{" "}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Compliance.
              </span>
              <br />
              <span className="text-3xl text-foreground/80 md:text-4xl">SMB Price.</span>
            </h1>

            <p className="mb-10 text-sm font-normal leading-relaxed text-muted-foreground">
              Stop paying 200k+ for compliance consultants. ComplianceForge gives you
              IBM-grade EU AI Act compliance tools for 49/month.
            </p>

            <div className="mb-10 grid grid-cols-2 gap-3">
              {[
                { icon: GitBranch, label: "GitHub Repo Scanner" },
                { icon: Zap, label: "Gemini AI Classification" },
                { icon: FileText, label: "Compliance Certificates" },
                { icon: Calendar, label: "Deadline Alerts" },
                { icon: Shield, label: "113 Articles Tracked" },
                { icon: Users, label: "Team Collaboration" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-foreground/80">
                  <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="bg-card px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Why ComplianceForge?
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left font-medium text-muted-foreground" />
                      <th className="p-3 font-medium text-muted-foreground">IBM OpenScale</th>
                      <th className="p-3 font-medium text-muted-foreground">Deloitte Audit</th>
                      <th className="bg-primary/20 p-3 font-semibold text-primary">ComplianceForge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ["Price", "\u20AC200k+/yr", "\u20AC50k project", "\u20AC49/mo"],
                      ["AI Classification", "Manual", "Consultant", "Gemini AI"],
                      ["GitHub Scanner", false, false, true],
                      ["Certificate PDF", true, true, true],
                      ["Time to comply", "6 months", "3 months", "1 hour"],
                    ] as [string, string | boolean, string | boolean, string | boolean][]).map(
                      ([label, ibm, deloitte, cf]) => (
                        <tr key={label} className="border-b border-border/50">
                          <td className="p-3 font-medium text-foreground/80">{label}</td>
                          <td className="p-3 text-center text-muted-foreground">
                            {typeof ibm === "boolean" ? (
                              ibm ? (
                                <CheckCircle className="mx-auto h-4 w-4 text-green-500" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-red-500" />
                              )
                            ) : (
                              ibm
                            )}
                          </td>
                          <td className="p-3 text-center text-muted-foreground">
                            {typeof deloitte === "boolean" ? (
                              deloitte ? (
                                <CheckCircle className="mx-auto h-4 w-4 text-green-500" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-red-500" />
                              )
                            ) : (
                              deloitte
                            )}
                          </td>
                          <td className="bg-primary/20 p-3 text-center font-medium text-foreground/80">
                            {typeof cf === "boolean" ? (
                              cf ? (
                                <CheckCircle className="mx-auto h-4 w-4 text-primary" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-red-500" />
                              )
                            ) : (
                              cf
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              BuildwithAiGiri Series — by Girish B. Hiremath | intelliforge.digital
            </p>
          </div>

          <main id="main-content" className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="rounded-lg border border-border bg-card/80 p-8 backdrop-blur-sm">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary">
                    <Shield className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Sign in to your compliance dashboard</p>
                </div>

                {registered && (
                  <div className="mb-6 rounded-lg border border-green-800/50 bg-green-950/50 p-4">
                    <p className="text-sm font-medium text-green-300">Account created successfully</p>
                    <p className="text-xs text-green-400">Sign in with your new credentials below.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground/80">
                      Work Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.eu"
                      className="w-full rounded-lg border border-input bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground/80">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-input bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      required
                      autoComplete="current-password"
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
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
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

                <div className="mt-6 border-t border-border pt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <a
                      href="/sign-up"
                      className="font-medium text-primary transition-colors duration-200 hover:text-primary/90"
                    >
                      Create one
                    </a>
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
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
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
