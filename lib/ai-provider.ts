/**
 * AI provider client supporting NVIDIA NIM (primary) and OpenRouter (fallback).
 * Both expose OpenAI-compatible chat completion endpoints.
 */

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
  provider: Provider,
  messages: ChatMessage[],
  signal: AbortSignal
): Promise<string> {
  const res = await fetch(provider.url, {
    method: "POST",
    headers: provider.headers,
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`${provider.url} HTTP ${res.status} [${provider.model}]: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
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
      console.warn(`[${label}] ${provider.model} via ${provider.url} failed: ${msg}`);
      errors.push(`${provider.model}: ${msg}`);
    }
  }

  throw new Error(`${label} — all providers failed: ${errors.join("; ")}`);
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
