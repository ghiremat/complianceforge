import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  Code,
  FileCheck,
  GitBranch,
  Globe,
  Lock,
  Package,
  Shield,
  Zap,
} from "lucide-react";
import { auth } from "@/auth";
import { cn, daysUntil } from "@/lib/utils";

const ENFORCEMENT_DATE = "2026-08-02";
const GITHUB_URL = "https://github.com/gengirish/complianceforge";
const DOCS_URL = `${GITHUB_URL}/blob/main/README.md`;

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const daysLeft = daysUntil(ENFORCEMENT_DATE);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-400/5 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-3 rounded-lg outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-950/50">
              <Shield className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold tracking-tight">
                ComplianceForge<span className="text-indigo-400">.ai</span>
              </p>
              <p className="text-xs text-slate-500">EU AI Act platform</p>
            </div>
          </Link>
          <nav className="flex items-center gap-3 text-sm sm:gap-4" aria-label="Primary">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden cursor-pointer rounded-lg text-slate-400 outline-none transition-colors duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] sm:inline"
            >
              GitHub
            </a>
            <Link
              href="/sign-in"
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 font-medium text-slate-200 outline-none transition-colors duration-200 hover:border-slate-600 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] sm:px-4"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white shadow-md shadow-indigo-950/40 outline-none transition-colors duration-200 hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] sm:px-4"
            >
              Sign Up
            </Link>
          </nav>
        </header>

        <main id="main-content">
          <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-600/15 shadow-lg shadow-indigo-950/40 sm:h-20 sm:w-20">
                  <Shield className="h-8 w-8 text-indigo-400 sm:h-10 sm:w-10" aria-hidden />
                </div>
              </div>

              <p
                className={cn(
                  "mb-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                  daysLeft <= 30
                    ? "border-red-800/80 bg-red-950/50 text-red-200"
                    : "border-slate-700 bg-slate-900/80 text-slate-300",
                )}
              >
                <Lock className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
                <span>
                  <span className="tabular-nums font-semibold text-white">{daysLeft}</span> days until EU
                  AI Act enforcement (August 2, 2026)
                </span>
              </p>

              <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-[3.25rem] lg:leading-[1.1]">
                The compliance infrastructure layer for{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
                  AI
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
                Automate EU AI Act classification, documentation, and monitoring. Integrate compliance into
                CI/CD pipelines. Ship trust with every deployment.
              </p>

              <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/sign-up"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-950/50 outline-none transition-colors duration-200 hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/#features"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-base font-semibold text-slate-200 outline-none transition-colors duration-200 hover:border-slate-600 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
                >
                  View Demo
                </Link>
              </div>
            </div>

            <div className="mx-auto mt-14 max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-5 backdrop-blur-sm sm:px-8">
              <ul className="flex flex-col flex-wrap items-center justify-center gap-y-3 text-center text-sm text-slate-400 sm:flex-row sm:gap-x-6 sm:gap-y-0 md:gap-x-10">
                {[
                  "14+ API endpoints",
                  "EU AI Act compliant",
                  "CycloneDX 1.5 BOM",
                  "Open source",
                ].map((label, i) => (
                  <li key={label} className="flex items-center gap-2 sm:gap-0">
                    {i > 0 && (
                      <span
                        className="mx-2 hidden h-1 w-1 shrink-0 rounded-full bg-slate-600 sm:inline"
                        aria-hidden
                      />
                    )}
                    <CheckCircle className="h-4 w-4 shrink-0 text-indigo-500 sm:hidden" aria-hidden />
                    <span className="font-medium text-slate-300">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            id="features"
            className="scroll-mt-24 border-t border-slate-800/80 bg-slate-950/30 py-16 sm:py-20"
            aria-labelledby="features-heading"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2
                  id="features-heading"
                  className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
                >
                  Everything you need to comply at velocity
                </h2>
                <p className="mt-4 text-slate-400">
                  From first classification to auditor-ready transparency — built for teams shipping AI in
                  the EU.
                </p>
              </div>

              <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {[
                  {
                    icon: Zap,
                    title: "AI Risk Classification",
                    body: "Automated risk tier assessment using AI.",
                  },
                  {
                    icon: GitBranch,
                    title: "CI/CD Integration",
                    body: "GitHub App runs compliance checks on every PR.",
                  },
                  {
                    icon: Code,
                    title: "Compliance-as-Code SDK",
                    body: "REST API for ML pipeline integration.",
                  },
                  {
                    icon: Globe,
                    title: "Compliance Passport",
                    body: "Public trust pages + embeddable widget.",
                  },
                  {
                    icon: Package,
                    title: "AI-BOM",
                    body: "CycloneDX 1.5 supply chain transparency.",
                  },
                  {
                    icon: FileCheck,
                    title: "Policy Engine",
                    body: "YAML-based complianceforge.yml for CI.",
                  },
                ].map(({ icon: Icon, title, body }) => (
                  <li
                    key={title}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/20 transition-colors duration-200 hover:border-slate-700"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="py-16 sm:py-20" aria-labelledby="how-heading">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <h2 id="how-heading" className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
                How it works
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-center text-slate-400">
                Three steps from registration to a shareable compliance story.
              </p>

              <ol className="mt-12 grid gap-6 md:grid-cols-3 md:gap-6">
                {[
                  {
                    step: "1",
                    title: "Register your AI system",
                    body: "Classify risk tier automatically from your system profile and evidence.",
                  },
                  {
                    step: "2",
                    title: "Integrate into your pipeline",
                    body: "Wire in CI/CD checks and the SDK so every release carries compliance signals.",
                  },
                  {
                    step: "3",
                    title: "Share compliance passport",
                    body: "Publish a public trust page your auditors and customers can verify in seconds.",
                  },
                ].map((item) => (
                  <li
                    key={item.step}
                    className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6"
                  >
                    <div className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-indigo-500/40 bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-950/50">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="border-t border-slate-800 py-16 sm:py-20" aria-labelledby="cta-heading">
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
              <h2 id="cta-heading" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                EU AI Act enforcement: August 2, 2026. Start now.
              </h2>
              <p className="mt-4 text-slate-400">
                Join teams using ComplianceForge as the compliance layer for AI delivery.
              </p>
              <Link
                href="/sign-up"
                className="mt-8 inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-indigo-950/40 outline-none transition-colors duration-200 hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
              >
                Create Free Account
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </div>
          </section>
        </main>

        <footer className="border-t border-slate-800 bg-slate-950/50 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
            <div>
              <p className="text-sm font-semibold text-white">
                ComplianceForge<span className="text-indigo-400">.ai</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Built for the EU AI Act (Regulation 2024/1689)
              </p>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400" aria-label="Footer">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer rounded outline-none transition-colors duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
              >
                GitHub
              </a>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer rounded outline-none transition-colors duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
              >
                Documentation
              </a>
              <Link
                href="/sign-in"
                className="cursor-pointer rounded outline-none transition-colors duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
              >
                Sign In
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
