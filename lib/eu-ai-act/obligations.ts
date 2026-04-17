export interface Obligation {
  id: string;
  article: string;
  title: string;
  description: string;
  appliesTo: ("provider" | "deployer" | "both")[];
  riskTiers: string[];
  category: "documentation" | "risk-management" | "governance" | "transparency" | "human-oversight" | "monitoring" | "registration" | "assessment" | "data" | "incident";
}

export const OBLIGATIONS: Obligation[] = [
  { id: "rm-system", article: "Article 9", title: "Risk management system", description: "Establish, implement, document, and maintain a risk management system throughout the AI system lifecycle.", appliesTo: ["provider"], riskTiers: ["high"], category: "risk-management" },
  { id: "data-governance", article: "Article 10", title: "Data and data governance", description: "Training, validation, and testing datasets must meet quality criteria; relevant design choices must be documented.", appliesTo: ["provider"], riskTiers: ["high"], category: "data" },
  { id: "tech-doc", article: "Article 11, Annex IV", title: "Technical documentation", description: "Draw up technical documentation per Annex IV before the system is placed on the market, keeping it up to date.", appliesTo: ["provider"], riskTiers: ["high"], category: "documentation" },
  { id: "record-keeping", article: "Article 12", title: "Record-keeping (logging)", description: "High-risk AI systems must allow automatic recording of events (logs) to enable traceability.", appliesTo: ["provider"], riskTiers: ["high"], category: "documentation" },
  { id: "transparency-hr", article: "Article 13", title: "Transparency and information to deployers", description: "High-risk AI must be designed to be sufficiently transparent for deployers to interpret and use output appropriately.", appliesTo: ["provider"], riskTiers: ["high"], category: "transparency" },
  { id: "human-oversight", article: "Article 14", title: "Human oversight", description: "Design high-risk AI to allow effective human oversight during use, including ability to override, interrupt, or reverse.", appliesTo: ["provider", "deployer"], riskTiers: ["high"], category: "human-oversight" },
  { id: "accuracy", article: "Article 15", title: "Accuracy, robustness, and cybersecurity", description: "High-risk AI must achieve appropriate levels of accuracy, robustness, and cybersecurity throughout lifecycle.", appliesTo: ["provider"], riskTiers: ["high"], category: "risk-management" },
  { id: "qms", article: "Article 17", title: "Quality management system", description: "Providers must establish a quality management system ensuring compliance, documented in policies and procedures.", appliesTo: ["provider"], riskTiers: ["high"], category: "governance" },
  { id: "conformity", article: "Articles 43–49", title: "Conformity assessment", description: "Undergo conformity assessment before placing on market. Self-assessment (Annex VI) or third-party (Annex VII) for biometric systems.", appliesTo: ["provider"], riskTiers: ["high"], category: "assessment" },
  { id: "eu-doc", article: "Article 47", title: "EU declaration of conformity", description: "Provider draws up EU declaration of conformity for each high-risk AI system.", appliesTo: ["provider"], riskTiers: ["high"], category: "assessment" },
  { id: "ce-marking", article: "Article 48", title: "CE marking", description: "High-risk AI systems bear CE marking indicating conformity.", appliesTo: ["provider"], riskTiers: ["high"], category: "assessment" },
  { id: "registration", article: "Article 49, 71", title: "EU database registration", description: "Register the system and provider/deployer in the EU database before placing on market or putting into service.", appliesTo: ["both"], riskTiers: ["high"], category: "registration" },
  { id: "pms", article: "Article 72", title: "Post-market monitoring", description: "Establish and maintain a post-market monitoring system, proportionate to the nature and risks.", appliesTo: ["provider"], riskTiers: ["high"], category: "monitoring" },
  { id: "incidents", article: "Article 73", title: "Serious incident reporting", description: "Report serious incidents to market surveillance authorities of Member States where the incident occurred.", appliesTo: ["provider"], riskTiers: ["high"], category: "incident" },
  { id: "fria", article: "Article 27", title: "Fundamental rights impact assessment", description: "Deployers who are public bodies or operate in banking, insurance, or high-risk domains must carry out a FRIA before putting the system into service.", appliesTo: ["deployer"], riskTiers: ["high"], category: "assessment" },
  { id: "deployer-use", article: "Article 26", title: "Deployer obligations", description: "Use high-risk AI in accordance with instructions, ensure human oversight, monitor operation, keep logs, inform employees/representatives.", appliesTo: ["deployer"], riskTiers: ["high"], category: "governance" },
  { id: "transparency-limited", article: "Article 50", title: "Transparency for limited-risk AI", description: "Providers of AI that interacts with persons, generates content, or performs emotion recognition must ensure transparency to users.", appliesTo: ["provider"], riskTiers: ["limited"], category: "transparency" },
  { id: "ai-literacy", article: "Article 4", title: "AI literacy", description: "Ensure staff dealing with AI systems have sufficient AI literacy, considering their technical knowledge, experience, and context of use.", appliesTo: ["both"], riskTiers: ["high", "limited", "minimal"], category: "governance" },
];

export function getObligationsForTier(tier: string, role?: string): Obligation[] {
  const t = tier.toLowerCase();
  return OBLIGATIONS.filter((o) => {
    if (!o.riskTiers.includes(t)) return false;
    if (role && !o.appliesTo.includes(role as "provider" | "deployer") && !o.appliesTo.includes("both")) return false;
    return true;
  });
}
