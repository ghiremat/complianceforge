export { trace } from "./trace";
export type { TraceOptions, TraceResult } from "./trace";

export interface ComplianceForgeOptions {
  apiKey: string;
  baseUrl?: string;
}

export class ComplianceForge {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: ComplianceForgeOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://complianceforge-ai.com";
  }

  async trace(
    options: Omit<import("./trace").TraceOptions, never>
  ): Promise<import("./trace").TraceResult> {
    const { trace: traceFn } = await import("./trace");
    return traceFn(options, this.apiKey, this.baseUrl);
  }
}
