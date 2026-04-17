export interface TraceOptions {
  systemId: string;
  prompt: string;
  output: string;
  model?: "gemma-2-2b" | "llama-3.2-1b";
  sessionId?: string;
}

export interface TraceResult {
  traceId: string;
  explanation: string;
  confidenceScore: number;
  art13Compliant: boolean;
  topFeatures: { name: string; attribution: number }[];
}

export async function trace(
  options: TraceOptions,
  apiKey: string,
  baseUrl: string = "https://complianceforge-ai.com"
): Promise<TraceResult> {
  const res = await fetch(
    `${baseUrl}/api/v1/systems/${options.systemId}/trace`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: options.prompt,
        output: options.output,
        model: options.model ?? "gemma-2-2b",
        session_id: options.sessionId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`ComplianceForge trace failed: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    traceId: data.trace_id,
    explanation: data.explanation,
    confidenceScore: data.confidence_score,
    art13Compliant: data.art13_compliant,
    topFeatures: data.attribution_graph?.top_features ?? [],
  };
}
