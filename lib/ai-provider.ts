/**
 * AI provider client supporting NVIDIA NIM (primary) and OpenRouter (fallback).
 * Both expose OpenAI-compatible chat completion endpoints.
 */

import { logger } from "@/lib/logger";

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const NIM_MODEL = "nvidia/llama-3.1-nemotron-ultra-253b-v1";
const OPENROUTER_MODEL = "nvidia/llama-3.1-nemotron-ultra-253b";
const OPENROUTER_FALLBACK = "nvidia/llama-3.3-nemotron-super-49b-v1";
const REQUEST_TIMEOUT_MS = 55_000;

type Provider = {
  url: string;
  model: string;
  headers: Record<string, string>;
  supportsJsonMode: boolean;
};

function getProviders(): Provider[] {
  const providers: Provider[] = [];
  const nimKey = process.env.NIM_API_KEY?.trim();
  const orKey = process.env.OPEN_ROUTER_KEY?.trim();

  if (nimKey) {
    providers.push({
      url: NIM_URL,
      model: NIM_MODEL,
      headers: {
        Authorization: `Bearer ${nimKey}`,
        "Content-Type": "application/json",
      },
      supportsJsonMode: false,
    });
  }

  if (orKey) {
    providers.push({
      url: OPENROUTER_URL,
      model: OPENROUTER_MODEL,
      headers: {
        Authorization: `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://complianceforge.ai",
        "X-Title": "ComplianceForge",
      },
      supportsJsonMode: true,
    });
    providers.push({
      url: OPENROUTER_URL,
      model: OPENROUTER_FALLBACK,
      headers: {
        Authorization: `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://complianceforge.ai",
        "X-Title": "ComplianceForge",
      },
      supportsJsonMode: true,
    });
  }

  if (providers.length === 0) {
    throw new Error("NIM_API_KEY or OPEN_ROUTER_KEY environment variable is required");
  }
  return providers;
}

export type AiSystemInput = {
  name: string;
  description?: string | null;
  sector: string;
  useCase: string;
  provider?: string | null;
  dataInputs?: string | null;
  decisionImpact?: string | null;
  endUsers?: string | null;
  deploymentRegion?: string | null;
};

export type ClassificationResult = {
  riskTier: string;
  confidence: number;
  justification: string;
  keyArticles: string[];
  requirements: string[];
  recommendations: string[];
  annexIiiCategory: string | null;
  annexIiiCategoryName: string | null;
  complianceGaps: string[];
  prohibitedPracticeId: string | null;
  borderlineNotes: string | null;
};

export type ScanFindingInput = {
  name: string;
  framework: string;
  files: string[];
  dependencies: string[];
  suggestedRiskTier: string;
  confidence: number;
};

export type ScanAnalysisResult = {
  overallScore: number;
  aiFrameworks: string[];
  articleFindings: Array<{ article: string; title: string; score: number; finding: string }>;
  priorityFixes: string[];
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

async function fetchChatCompletion(
  provider: Provider,
  messages: ChatMessage[],
  signal: AbortSignal
): Promise<string> {
  const payload: Record<string, unknown> = {
    model: provider.model,
    messages,
    temperature: 0.2,
    max_tokens: 2048,
  };
  if (provider.supportsJsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const res = await fetch(provider.url, {
    method: "POST",
    headers: provider.headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`${provider.url} HTTP ${res.status} [${provider.model}]: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        reasoning_content?: string | null;
      };
    }>;
  };
  const msg = data.choices?.[0]?.message;
  const content = msg?.content?.trim() || msg?.reasoning_content?.trim();
  if (!content) {
    throw new Error(`${provider.model} returned empty content`);
  }
  return content;
}

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(id);
  }
}

async function runChatJson<T>(
  provider: Provider,
  messages: ChatMessage[],
  label: string
): Promise<T> {
  return withTimeout(REQUEST_TIMEOUT_MS, async (signal) => {
    const raw = await fetchChatCompletion(provider, messages, signal);
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonObject(raw));
    } catch (e) {
      throw new Error(`${label}: invalid JSON (${e instanceof Error ? e.message : String(e)})`);
    }
    return parsed as T;
  });
}

/** Try each provider in order (NIM → OpenRouter primary → OpenRouter fallback). */
async function runWithProviderFallback<T>(
  messages: ChatMessage[],
  label: string
): Promise<T> {
  const providers = getProviders();
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      return await runChatJson<T>(provider, messages, label);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[${label}] ${provider.model} via ${provider.url} failed: ${msg}`);
      errors.push(`${provider.model}: ${msg}`);
    }
  }

  throw new Error(`${label} — all providers failed: ${errors.join("; ")}`);
}

const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert EU AI Act (Regulation (EU) 2024/1689) compliance assessor performing risk classification under Article 6.

CLASSIFICATION FRAMEWORK:

1. UNACCEPTABLE (Article 5) — Prohibited practices:
   - Subliminal manipulation causing harm (Art. 5(1)(a))
   - Exploiting vulnerabilities of age/disability/economic situation (Art. 5(1)(b))
   - Social scoring by public authorities or cross-context scoring (Art. 5(1)(c))
   - Crime prediction based solely on profiling/personality (Art. 5(1)(d))
   - Untargeted facial recognition database scraping (Art. 5(1)(e))
   - Emotion recognition in workplace/education (Art. 5(1)(f))
   - Biometric categorisation for sensitive attributes (Art. 5(1)(g))
   - Real-time remote biometric identification in public spaces (Art. 5(1)(h))

2. HIGH-RISK (Article 6(2), Annex III) — 8 categories:
   Category 1: Biometrics — identification, categorisation, emotion recognition
   Category 2: Critical infrastructure — digital infra, traffic, utilities safety
   Category 3: Education — admissions, grading, exam proctoring
   Category 4: Employment — recruitment, HR decisions, task allocation, monitoring
   Category 5: Essential services — credit scoring, insurance, benefits, emergency dispatch
   Category 6: Law enforcement — risk assessment, evidence, profiling, crime analytics
   Category 7: Migration & border — asylum, visa, border ID, migration risk
   Category 8: Justice & democracy — legal research, judicial support, election influence

   Also high-risk under Article 6(1): AI as safety component of products under Annex I EU harmonisation legislation.

3. LIMITED RISK (Article 50) — Transparency obligations:
   - AI interacting with persons (chatbots) must disclose AI nature
   - Emotion recognition or biometric categorisation systems must inform subjects
   - AI-generated content (deepfakes, synthetic text) must be labelled

4. MINIMAL RISK — All other AI systems. Voluntary codes of conduct apply.

INSTRUCTIONS:
- Classify into exactly one tier based on the framework above
- For high-risk, identify the specific Annex III category (1-8) or Annex I product
- For unacceptable, identify the specific Article 5 prohibition
- Provide concrete, article-referenced justification
- Flag if the system is borderline between tiers
- Consider the ROLE: provider (develops/places on market) vs deployer (uses in professional activity)

Respond ONLY with a JSON object:
{
  "riskTier": "unacceptable" | "high" | "limited" | "minimal",
  "confidence": number (0-1),
  "justification": string (cite specific articles),
  "keyArticles": string[],
  "requirements": string[] (concrete obligations from the Act),
  "recommendations": string[] (actionable next steps),
  "annexIiiCategory": number | null (1-8 if high-risk Annex III, null otherwise),
  "annexIiiCategoryName": string | null (category title if applicable),
  "complianceGaps": string[],
  "prohibitedPracticeId": string | null (e.g. "art5-1a" if unacceptable),
  "borderlineNotes": string | null (if classification is uncertain)
}`;

function buildClassificationUserPrompt(system: AiSystemInput): string {
  return `Assess this AI system under the EU AI Act.

Name: ${system.name}
Sector: ${system.sector}
Use case: ${system.useCase}
Provider: ${system.provider ?? "unknown"}
Description: ${system.description ?? "—"}
Data inputs: ${system.dataInputs ?? "—"}
Decision impact: ${system.decisionImpact ?? "—"}
End users: ${system.endUsers ?? "—"}
Deployment region: ${system.deploymentRegion ?? "—"}`;
}

function normalizeClassification(raw: ClassificationResult): ClassificationResult {
  return {
    riskTier: String(raw.riskTier ?? "minimal").toLowerCase(),
    confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0)),
    justification: String(raw.justification ?? ""),
    keyArticles: Array.isArray(raw.keyArticles) ? raw.keyArticles.map(String) : [],
    requirements: Array.isArray(raw.requirements) ? raw.requirements.map(String) : [],
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations.map(String) : [],
    annexIiiCategory: raw.annexIiiCategory != null ? String(raw.annexIiiCategory) : null,
    annexIiiCategoryName: raw.annexIiiCategoryName ? String(raw.annexIiiCategoryName) : null,
    complianceGaps: Array.isArray(raw.complianceGaps) ? raw.complianceGaps.map(String) : [],
    prohibitedPracticeId: raw.prohibitedPracticeId ? String(raw.prohibitedPracticeId) : null,
    borderlineNotes: raw.borderlineNotes ? String(raw.borderlineNotes) : null,
  };
}

export async function classifyAiSystem(system: AiSystemInput): Promise<ClassificationResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
    { role: "user", content: buildClassificationUserPrompt(system) },
  ];
  const raw = await runWithProviderFallback<ClassificationResult>(
    messages,
    "classifyAiSystem"
  );
  return normalizeClassification(raw);
}

const SCAN_SYSTEM_PROMPT = `You are an EU AI Act compliance analyst reviewing repository scan findings (dependencies and model files).
Given the findings JSON, produce a concise analysis. Respond ONLY with a JSON object:
{
  "overallScore": number (0-100, higher = better alignment / lower apparent risk from scan signals),
  "aiFrameworks": string[] (distinct frameworks or libraries inferred),
  "articleFindings": [{ "article": string, "title": string, "score": number (0-100), "finding": string }],
  "priorityFixes": string[] (actionable remediation steps)
}
Use short "title" strings. Map implications to relevant EU AI Act articles where reasonable.`;

export async function scanRepositoryWithAI(
  repoUrl: string,
  findings: ScanFindingInput[]
): Promise<ScanAnalysisResult> {
  const user = JSON.stringify({ repoUrl, findings }, null, 2);
  const messages: ChatMessage[] = [
    { role: "system", content: SCAN_SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
  const raw = await runWithProviderFallback<ScanAnalysisResult>(messages, "scanRepositoryWithAI");

  return {
    overallScore: Math.min(100, Math.max(0, Number(raw.overallScore) || 0)),
    aiFrameworks: Array.isArray(raw.aiFrameworks) ? raw.aiFrameworks.map(String) : [],
    articleFindings: Array.isArray(raw.articleFindings)
      ? raw.articleFindings.map((a) => ({
          article: String(a.article ?? ""),
          title: String(a.title ?? ""),
          score: Math.min(100, Math.max(0, Number(a.score) || 0)),
          finding: String(a.finding ?? ""),
        }))
      : [],
    priorityFixes: Array.isArray(raw.priorityFixes) ? raw.priorityFixes.map(String) : [],
  };
}
