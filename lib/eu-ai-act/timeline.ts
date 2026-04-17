export interface RegulatoryMilestone {
  id: string;
  date: string;
  article: string;
  title: string;
  description: string;
  appliesTo: ("all" | "prohibited" | "high-risk" | "limited" | "gpai" | "provider" | "deployer")[];
  status: "passed" | "upcoming" | "future";
}

function milestoneStatus(date: string): "passed" | "upcoming" | "future" {
  const d = new Date(date);
  const now = new Date();
  const sixMonths = 180 * 24 * 60 * 60 * 1000;
  if (d <= now) return "passed";
  if (d.getTime() - now.getTime() <= sixMonths) return "upcoming";
  return "future";
}

export const EU_AI_ACT_TIMELINE: RegulatoryMilestone[] = ([
  {
    id: "entry-into-force",
    date: "2024-08-01",
    article: "Article 113",
    title: "EU AI Act enters into force",
    description: "Regulation (EU) 2024/1689 officially enters into force, 20 days after publication in the Official Journal.",
    appliesTo: ["all"],
  },
  {
    id: "ai-literacy",
    date: "2025-02-02",
    article: "Article 4",
    title: "AI literacy obligations apply",
    description: "Providers and deployers must ensure sufficient AI literacy among staff dealing with AI systems.",
    appliesTo: ["provider", "deployer"],
  },
  {
    id: "prohibited-practices",
    date: "2025-02-02",
    article: "Article 5",
    title: "Prohibited AI practices ban takes effect",
    description: "All prohibited AI practices under Article 5 are banned. Systems deploying prohibited practices must be withdrawn.",
    appliesTo: ["prohibited"],
  },
  {
    id: "notified-bodies",
    date: "2025-08-02",
    article: "Articles 28–39",
    title: "Notified bodies designation rules apply",
    description: "Member states must designate notifying authorities and notified bodies for conformity assessment.",
    appliesTo: ["all"],
  },
  {
    id: "gpai-obligations",
    date: "2025-08-02",
    article: "Articles 51–56",
    title: "General-purpose AI model obligations apply",
    description: "GPAI model providers must comply with transparency, documentation, copyright, and (for systemic risk) safety obligations.",
    appliesTo: ["gpai", "provider"],
  },
  {
    id: "governance-penalties",
    date: "2025-08-02",
    article: "Articles 64–69, 99–101",
    title: "Governance structure and penalties framework applies",
    description: "AI Office, AI Board, advisory forum operational. Penalty provisions (up to €35M / 7% turnover) enforceable.",
    appliesTo: ["all"],
  },
  {
    id: "high-risk-annex-i",
    date: "2026-08-02",
    article: "Article 6(1), Annex I",
    title: "High-risk AI in regulated products — full obligations",
    description: "AI systems that are safety components of products covered by Union harmonisation legislation in Annex I must comply with all high-risk requirements (Articles 8–15, 25–27).",
    appliesTo: ["high-risk", "provider", "deployer"],
  },
  {
    id: "high-risk-annex-iii",
    date: "2026-08-02",
    article: "Article 6(2), Annex III",
    title: "High-risk stand-alone AI — full obligations",
    description: "Stand-alone high-risk AI systems listed in Annex III must comply with all requirements: risk management (Art. 9), data governance (Art. 10), documentation (Art. 11), record-keeping (Art. 12), transparency (Art. 13), human oversight (Art. 14), accuracy/robustness (Art. 15).",
    appliesTo: ["high-risk", "provider", "deployer"],
  },
  {
    id: "deployer-obligations",
    date: "2026-08-02",
    article: "Articles 26–27",
    title: "Deployer obligations including FRIA",
    description: "Deployers of high-risk AI must carry out fundamental rights impact assessments (Article 27), ensure human oversight, inform affected persons, and cooperate with authorities.",
    appliesTo: ["high-risk", "deployer"],
  },
  {
    id: "eu-database",
    date: "2026-08-02",
    article: "Article 71",
    title: "EU database registration mandatory",
    description: "High-risk AI systems and their providers/deployers must be registered in the EU database before placing on the market.",
    appliesTo: ["high-risk", "provider", "deployer"],
  },
  {
    id: "conformity-assessment",
    date: "2026-08-02",
    article: "Articles 40–49",
    title: "Conformity assessment required",
    description: "High-risk AI systems must undergo conformity assessment (self-assessment per Annex VI or third-party per Annex VII for biometric systems) before market placement.",
    appliesTo: ["high-risk", "provider"],
  },
  {
    id: "post-market-monitoring",
    date: "2026-08-02",
    article: "Article 72",
    title: "Post-market monitoring systems required",
    description: "Providers of high-risk AI must establish and maintain post-market monitoring systems proportionate to the nature of the AI system.",
    appliesTo: ["high-risk", "provider"],
  },
  {
    id: "incident-reporting",
    date: "2026-08-02",
    article: "Article 73",
    title: "Serious incident reporting obligation",
    description: "Providers must report serious incidents to market surveillance authorities within prescribed timeframes.",
    appliesTo: ["high-risk", "provider"],
  },
  {
    id: "existing-high-risk",
    date: "2027-08-02",
    article: "Article 111(2)",
    title: "Existing high-risk AI systems — compliance deadline",
    description: "High-risk AI systems already on the market must be brought into compliance if significantly modified. Systems used by public authorities have until this date.",
    appliesTo: ["high-risk", "provider", "deployer"],
  },
] as Omit<RegulatoryMilestone, "status">[]).map((m) => ({ ...m, status: milestoneStatus(m.date) }));

export function getUpcomingMilestones(): RegulatoryMilestone[] {
  return EU_AI_ACT_TIMELINE.filter((m) => m.status !== "passed");
}

export function getMilestonesForRiskTier(tier: string): RegulatoryMilestone[] {
  const t = tier.toLowerCase();
  if (t === "unacceptable") return EU_AI_ACT_TIMELINE.filter((m) => m.appliesTo.includes("prohibited") || m.appliesTo.includes("all"));
  if (t === "high") return EU_AI_ACT_TIMELINE.filter((m) => m.appliesTo.includes("high-risk") || m.appliesTo.includes("all"));
  if (t === "limited") return EU_AI_ACT_TIMELINE.filter((m) => m.appliesTo.includes("all"));
  return EU_AI_ACT_TIMELINE.filter((m) => m.appliesTo.includes("all"));
}
