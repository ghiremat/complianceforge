/**
 * OpenRouter (OpenAI-compatible) client for EU AI Act classification and repo scan analysis.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "nvidia/llama-3.1-nemotron-ultra-253b";
const FALLBACK_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1";
const REQUEST_TIMEOUT_MS = 30_000;

/** Fallback key when OPEN_ROUTER_KEY is unset (prefer env in production). */
const OPEN_ROUTER_KEY_FALLBACK =
  "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";

function getOpenRouterKey(): string {
  return process.env.OPEN_ROUTER_KEY?.trim() || OPEN_ROUTER_KEY_FALLBACK;
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
  complianceGaps: string[];
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
  model: string,
  messages: ChatMessage[],
  signal: AbortSignal
): Promise<string> {
  const key = getOpenRouterKey();
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://complianceforge.ai",
      "X-Title": "ComplianceForge",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned empty content");
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
  model: string,
  messages: ChatMessage[],
  label: string
): Promise<T> {
  return withTimeout(REQUEST_TIMEOUT_MS, async (signal) => {
    const raw = await fetchChatCompletion(model, messages, signal);
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonObject(raw));
    } catch (e) {
      throw new Error(`${label}: invalid JSON (${e instanceof Error ? e.message : String(e)})`);
    }
    return parsed as T;
  });
}

/** Try primary model, then one retry with fallback model on failure. */
async function runChatJsonWithModelFallback<T>(
  messages: ChatMessage[],
  label: string
): Promise<T> {
  try {
    return await runChatJson<T>(DEFAULT_MODEL, messages, label);
  } catch (first) {
    try {
      return await runChatJson<T>(FALLBACK_MODEL, messages, label);
    } catch (second) {
      const a = first instanceof Error ? first.message : String(first);
      const b = second instanceof Error ? second.message : String(second);
      throw new Error(`${label} failed: ${a}; fallback: ${b}`);
    }
  }
}

const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert EU AI Act (Regulation (EU) 2024/1689) compliance assessor.
Classify the described AI system into exactly one risk tier: "unacceptable", "high", "limited", or "minimal".
Base your reasoning on the regulation's definitions, prohibited practices, high-risk categories (Annex III), and transparency obligations for limited-risk AI.
Respond ONLY with a single JSON object (no markdown) with this exact shape:
{
  "riskTier": string,
  "confidence": number (0-1),
  "justification": string,
  "keyArticles": string[] (relevant articles/annexes as short references, e.g. "Article 5", "Annex III"),
  "requirements": string[] (concrete obligations that likely apply),
  "recommendations": string[] (next steps for the operator),
  "annexIiiCategory": string | null (if high-risk and mappable to an Annex III category name, else null),
  "complianceGaps": string[] (gaps or unknowns to clarify)
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
    annexIiiCategory:
      raw.annexIiiCategory === null || raw.annexIiiCategory === undefined
        ? null
        : String(raw.annexIiiCategory),
    complianceGaps: Array.isArray(raw.complianceGaps) ? raw.complianceGaps.map(String) : [],
  };
}

export async function classifyAiSystem(system: AiSystemInput): Promise<ClassificationResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
    { role: "user", content: buildClassificationUserPrompt(system) },
  ];
  const raw = await runChatJsonWithModelFallback<ClassificationResult>(
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
  const raw = await runChatJsonWithModelFallback<ScanAnalysisResult>(messages, "scanRepositoryWithAI");

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
