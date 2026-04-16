import type { Document, Incident } from "@prisma/client";
import { db } from "@/server/db";
import { ANNEX_IV_SECTIONS } from "@/types";

const MIN_SECTION_CONTENT_LEN = 80;

export type ScoreCriterion = {
  id: string;
  label: string;
  earned: number;
  max: number;
};

function normStatus(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function isApproved(status: string | null | undefined): boolean {
  return normStatus(status) === "approved";
}

function countAnnexSubstantive(
  docs: { section: number; content: string | null; status?: string | null }[]
): number {
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

function docModuleApproved(docs: Pick<Document, "type" | "status">[], moduleType: string): boolean {
  return docs.some((d) => d.type === moduleType && isApproved(d.status));
}

export function getScoreGrade(score: number): string {
  const s = Math.min(100, Math.max(0, score));
  if (s >= 90) return "A";
  if (s >= 80) return "B";
  if (s >= 70) return "C";
  if (s >= 60) return "D";
  return "F";
}

export function getScoreStyle(grade: string): { text: string } {
  switch (grade) {
    case "A":
      return { text: "text-emerald-400" };
    case "B":
      return { text: "text-teal-400" };
    case "C":
      return { text: "text-amber-300" };
    case "D":
      return { text: "text-orange-400" };
    default:
      return { text: "text-red-400" };
  }
}

/**
 * EU AI Act program maturity score (0–100) aligned with the ComplianceForge v2 rubric,
 * mapped onto the current Prisma schema (documents, assessments, conformity, incidents, deadlines).
 */
export async function calculateComplianceScore(systemId: string): Promise<{
  score: number;
  grade: string;
  criteria: ScoreCriterion[];
}> {
  const system = await db.aiSystem.findUnique({
    where: { id: systemId },
    include: {
      incidents: true,
      assessments: { orderBy: { createdAt: "desc" }, take: 1 },
      documents: true,
      conformityAssessments: { orderBy: { startedAt: "desc" }, take: 1 },
      complianceDeadlines: {
        where: { status: "pending", dueDate: { lt: new Date() } },
      },
    },
  });

  if (!system) {
    return { score: 0, grade: "F", criteria: [] };
  }

  const docs: Document[] = system.documents;
  const annexDocs = docs.filter((d: Document) => d.type === "annex_iv");
  const annexDone = countAnnexSubstantive(annexDocs);
  const annexTotal = ANNEX_IV_SECTIONS.length;
  const annexApprovedSections = new Set(
    annexDocs.filter((d) => isApproved(d.status)).map((d) => d.section)
  );
  const annexApprovedCount = [...annexApprovedSections].filter(
    (s) => s >= 1 && s <= annexTotal
  ).length;

  const latestAssessment = system.assessments[0];
  const riskClassDone =
    !!latestAssessment && normStatus(latestAssessment.riskTier) !== "unassessed";

  const technicalEarned = Math.round(
    (15 * Math.max(annexDone, annexApprovedCount)) / Math.max(1, annexTotal)
  );

  const riskMgmtMax = 10;
  const riskMgmtEarned = docModuleApproved(docs, "risk_management") ? riskMgmtMax : 0;

  const dataGovMax = 10;
  const dataGovEarned = docModuleApproved(docs, "data_governance") ? dataGovMax : 0;

  const humanMax = 10;
  const humanEarned = docModuleApproved(docs, "human_oversight") ? humanMax : 0;

  const qmsMax = 10;
  const qmsEarned = docModuleApproved(docs, "quality_management") ? qmsMax : 0;

  const postMarketMax = 10;
  const postMarketEarned = docModuleApproved(docs, "post_market") ? postMarketMax : 0;

  const conformity = system.conformityAssessments[0];
  const conformityMax = 15;
  let conformityEarned = 0;
  if (conformity) {
    const st = normStatus(conformity.status);
    if (st === "completed" || st === "passed" || conformity.certificateUrl) {
      conformityEarned = conformityMax;
    } else if (st === "in_progress") {
      conformityEarned = Math.min(conformityMax, Math.round((conformity.completionPct / 100) * 10));
    }
  }

  const euDbMax = 10;
  const euDbEarned = docModuleApproved(docs, "eu_registration") ? euDbMax : 0;

  const criteria: ScoreCriterion[] = [
    {
      id: "risk_classification",
      label: "Risk classification recorded",
      earned: riskClassDone ? 10 : 0,
      max: 10,
    },
    { id: "risk_management", label: "Risk management plan (approved)", earned: riskMgmtEarned, max: riskMgmtMax },
    {
      id: "technical_documentation",
      label: "Technical documentation (Annex IV maturity)",
      earned: Math.min(15, technicalEarned),
      max: 15,
    },
    { id: "data_governance", label: "Data governance (approved)", earned: dataGovEarned, max: dataGovMax },
    { id: "human_oversight", label: "Human oversight (approved)", earned: humanEarned, max: humanMax },
    { id: "quality_management", label: "Quality management (approved)", earned: qmsEarned, max: qmsMax },
    {
      id: "post_market",
      label: "Post-market monitoring (approved)",
      earned: postMarketEarned,
      max: postMarketMax,
    },
    {
      id: "conformity_assessment",
      label: "Conformity assessment",
      earned: conformityEarned,
      max: conformityMax,
    },
    { id: "eu_database", label: "EU database registration (approved record)", earned: euDbEarned, max: euDbMax },
  ];

  let raw = criteria.reduce((sum, c) => sum + c.earned, 0);

  for (const inc of system.incidents as Incident[]) {
    const st = normStatus(inc.status);
    if (st === "resolved" || st === "closed") continue;
    const sev = normStatus(inc.severity);
    if (sev === "critical") raw -= 20;
    else if (sev === "high") raw -= 10;
  }

  const overdueReviews = system.complianceDeadlines.length;
  raw -= overdueReviews * 5;

  const score = Math.min(100, Math.max(0, raw));
  const grade = getScoreGrade(score);

  await db.aiSystem
    .update({
      where: { id: systemId },
      data: { complianceScore: score },
    })
    .catch(() => {});

  return { score, grade, criteria };
}
