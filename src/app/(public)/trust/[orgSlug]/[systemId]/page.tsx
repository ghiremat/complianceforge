import { db } from "@/server/db";
import { ANNEX_IV_SECTIONS } from "@/types";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { getScoreGrade, getScoreStyle } from "@/lib/compliance-scoring";
import { ExplainabilityEvidence } from "@/src/components/passport/ExplainabilityEvidence";

const MIN_SECTION_CONTENT_LEN = 80;

type PageProps = { params: Promise<{ orgSlug: string; systemId: string }> };

function riskTierStyles(tier: string): { label: string; badge: string; dot: string } {
  const t = tier.toLowerCase();
  if (t === "minimal") {
    return {
      label: "Minimal risk",
      badge: "border-emerald-500/40 bg-emerald-950/80 text-emerald-100",
      dot: "bg-emerald-400",
    };
  }
  if (t === "limited") {
    return {
      label: "Limited risk",
      badge: "border-blue-500/40 bg-blue-950/80 text-blue-100",
      dot: "bg-blue-400",
    };
  }
  if (t === "high") {
    return {
      label: "High-risk AI system",
      badge: "border-amber-500/45 bg-amber-950/70 text-amber-100",
      dot: "bg-amber-400",
    };
  }
  if (t === "unacceptable") {
    return {
      label: "Unacceptable risk",
      badge: "border-red-500/45 bg-red-950/80 text-red-100",
      dot: "bg-red-500",
    };
  }
  return {
    label: "Risk tier not finalized",
    badge: "border-gray-600 bg-gray-900 text-gray-200",
    dot: "bg-gray-400",
  };
}

function countAnnexSections(docs: { section: number; content: string }[]): number {
  const substantive = new Set<number>();
  for (const d of docs) {
    if (
      d.section >= 1 &&
      d.section <= ANNEX_IV_SECTIONS.length &&
      (d.content?.trim().length ?? 0) >= MIN_SECTION_CONTENT_LEN
    ) {
      substantive.add(d.section);
    }
  }
  return substantive.size;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

async function loadTrustContext(orgSlug: string, systemId: string) {
  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!org) return null;

  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: org.id },
    include: {
      passportConfig: true,
      documents: {
        where: { type: "annex_iv" },
        select: { section: true, content: true },
      },
      assessments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, riskTier: true },
      },
    },
  });

  if (!system?.passportConfig?.enabled) return null;

  return { org, system };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orgSlug, systemId } = await params;
  const ctx = await loadTrustContext(orgSlug, systemId);
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  if (!ctx) {
    return {
      title: "Compliance passport | ComplianceForge",
      description: "This compliance passport is not available or has been disabled.",
      robots: { index: false, follow: false },
    };
  }

  const { org, system } = ctx;
  const annexDone = countAnnexSections(system.documents);
  const annexTotal = ANNEX_IV_SECTIONS.length;
  const title = `${system.name} — EU AI Act compliance passport`;
  const description = `${org.name} publishes this trust snapshot for ${system.name}: ${annexDone}/${annexTotal} Annex IV sections documented, risk tier ${system.riskTier}, compliance score ${system.complianceScore}/100.`;

  return {
    metadataBase: new URL(base),
    title,
    description,
    openGraph: { title, description, type: "website", siteName: "ComplianceForge" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function TrustPassportPage({ params }: PageProps) {
  const { orgSlug, systemId } = await params;
  const ctx = await loadTrustContext(orgSlug, systemId);
  if (!ctx) notFound();

  const { org, system } = ctx;
  const cfg = system.passportConfig!;
  const annexDone = countAnnexSections(system.documents);
  const annexTotal = ANNEX_IV_SECTIONS.length;
  const lastAssessment = system.assessments[0];
  const score = Math.min(100, Math.max(0, system.complianceScore));
  const grade = getScoreGrade(score);
  const scoreStyle = getScoreStyle(grade);
  const risk = riskTierStyles(system.riskTier);

  const h = await headers();
  const xf = h.get("x-forwarded-for");
  const visitorIp = (xf?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null) ?? null;

  void db.passportAccessLog
    .create({
      data: {
        passportConfigId: cfg.id,
        visitorIp,
        action: "page_view",
        resourceAccessed: `/trust/${orgSlug}/${systemId}`,
      },
    })
    .catch(() => {});

  const accent = cfg.brandColor?.trim() || "#14b8a6";
  const appOrigin = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  return (
    <div
      className="min-h-screen bg-gray-950 text-gray-100 antialiased"
      style={{ ["--passport-accent" as string]: accent } as CSSProperties}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in oklab, var(--passport-accent) 35%, transparent), transparent),
            radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.12) 0%, transparent 42%),
            radial-gradient(circle at 0% 100%, rgba(20, 184, 166, 0.08) 0%, transparent 45%)`,
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-10 text-center sm:mb-14">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-500">
            Verified compliance passport
          </p>
          <p className="text-sm font-medium text-gray-400">{org.name}</p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            {system.name}
          </h1>
          <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold shadow-lg shadow-black/20 ${risk.badge}`}
            >
              <span className={`mr-2.5 h-2 w-2 shrink-0 rounded-full ${risk.dot}`} />
              {risk.label}
            </span>
            <span className="rounded-full border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-400">
              EU AI Act
            </span>
          </div>
        </header>

        <main className="flex flex-col gap-6">
          <section className="rounded-2xl border border-gray-800 bg-gray-900/90 p-8 shadow-2xl shadow-black/50 backdrop-blur-sm sm:p-10">
            <div className="flex flex-col items-stretch gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <p className="text-sm font-medium text-gray-400">Compliance score</p>
                <p className="mt-1 text-xs text-gray-500">Program maturity (0–100)</p>
                <div className="mt-6 flex items-end gap-3">
                  <span
                    className={`text-7xl font-bold tabular-nums leading-none tracking-tight sm:text-8xl ${scoreStyle.text}`}
                  >
                    {score}
                  </span>
                  <div className="mb-2 flex flex-col items-start">
                    <span className="rounded-md border border-gray-700 bg-gray-950 px-2 py-0.5 text-xs font-bold uppercase text-gray-300">
                      Grade {grade}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid w-full gap-4 sm:grid-cols-2 lg:max-w-md lg:grid-cols-1">
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Documentation
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                    {annexDone}{" "}
                    <span className="text-lg font-medium text-gray-500">/ {annexTotal}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-400">Annex IV sections</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(annexDone / annexTotal) * 100}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Last assessment
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white tabular-nums">
                    {formatDate(lastAssessment?.createdAt)}
                  </p>
                  {lastAssessment ? (
                    <p className="mt-2 text-xs text-gray-500">
                      Recorded tier:{" "}
                      <span className="text-gray-400">{lastAssessment.riskTier}</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">No assessment on file yet.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Key details
            </h2>
            <dl className="mt-6 grid gap-6 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Sector</dt>
                <dd className="mt-1 text-sm font-medium text-gray-100">{system.sector}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Deployment region</dt>
                <dd className="mt-1 text-sm font-medium text-gray-100">
                  {system.deploymentRegion}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-medium text-gray-500">Use case</dt>
                <dd className="mt-1 text-sm leading-relaxed text-gray-200">{system.useCase}</dd>
              </div>
            </dl>
          </section>

          <ExplainabilityEvidence systemId={systemId} />

          <p className="rounded-xl border border-gray-800/80 bg-gray-900/40 px-5 py-4 text-center text-xs leading-relaxed text-gray-500">
            Information is published voluntarily by the organization via ComplianceForge. This page is
            not legal advice or a regulatory attestation.
          </p>
        </main>

        <footer className="mt-12 border-t border-gray-800 pt-10 text-center">
          <p className="text-sm text-gray-500">
            <span className="text-gray-400">Powered by</span>{" "}
            <a
              href={appOrigin}
              className="font-semibold text-gray-200 underline decoration-gray-600 underline-offset-4 transition hover:text-white hover:decoration-teal-500/80"
            >
              ComplianceForge
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
