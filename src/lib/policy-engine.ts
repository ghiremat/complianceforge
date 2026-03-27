/**
 * Parses `complianceforge.yml`-style policy files and evaluates PR scan findings.
 * Uses a small YAML subset parser (no extra dependencies).
 */

import type { ScanFinding } from "@/lib/github-scanner";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PolicyEnforcement = "blocking" | "warning" | "informational";

export type PolicyCompliance = {
  framework: string;
  enforcement: PolicyEnforcement;
};

export type PolicyRules = {
  require_registration: boolean;
  require_documentation: string[];
  max_risk_tier_without_approval: string;
  auto_classify: boolean;
};

export type PolicyIgnore = {
  paths: string[];
  models: string[];
};

export type PolicyNotifications = {
  slack_channel?: string;
  email?: string;
};

export type PolicyConfig = {
  version: number;
  compliance: PolicyCompliance;
  rules: PolicyRules;
  ignore: PolicyIgnore;
  notifications: PolicyNotifications;
};

export type PolicyViolation = {
  rule: string;
  message: string;
  severity: "error" | "warning" | "info";
  details: Record<string, unknown>;
};

export type ComplianceCheckResult = {
  passed: boolean;
  violations: PolicyViolation[];
  enforcement: PolicyEnforcement;
};

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_POLICY: PolicyConfig = {
  version: 1,
  compliance: {
    framework: "eu-ai-act",
    enforcement: "warning",
  },
  rules: {
    require_registration: false,
    require_documentation: [],
    max_risk_tier_without_approval: "high",
    auto_classify: true,
  },
  ignore: {
    paths: [],
    models: [],
  },
  notifications: {},
};

/** Relative risk weight; higher means stricter tier */
const RISK_RANK: Record<string, number> = {
  minimal: 0,
  none: 0,
  unassessed: 1,
  limited: 2,
  high: 3,
  unacceptable: 4,
};

function riskRank(tier: string): number {
  const k = tier.trim().toLowerCase();
  return RISK_RANK[k] ?? 1;
}

// ─── Lightweight YAML (indent-based subset) ─────────────────────────────────

function trimComment(line: string): string {
  const idx = line.indexOf("#");
  if (idx === -1) return line.trimEnd();
  return line.slice(0, idx).trimEnd();
}

function getIndent(line: string): number {
  const m = /^([\t ]*)/.exec(line);
  const raw = m?.[1] ?? "";
  return raw.replace(/\t/g, "  ").length;
}

function parseScalar(s: string): unknown {
  const t = s.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null" || t === "~") return null;
  if (/^-?\d+$/.test(t)) return Number(t);
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function parseArray(
  lines: string[],
  start: number,
  itemIndent: number
): { values: unknown[]; end: number } {
  const values: unknown[] = [];
  let i = start;
  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const ind = getIndent(raw);
    if (ind < itemIndent) break;
    if (ind !== itemIndent) {
      i++;
      continue;
    }
    const t = trimComment(raw.slice(ind));
    if (!t.startsWith("- ")) break;
    values.push(parseScalar(t.slice(2).trim()));
    i++;
  }
  return { values, end: i };
}

function parseSection(
  lines: string[],
  start: number,
  baseIndent: number
): { obj: Record<string, unknown>; end: number } {
  const o: Record<string, unknown> = {};
  let i = start;

  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const ind = getIndent(raw);
    if (ind < baseIndent) break;
    if (ind > baseIndent) {
      i++;
      continue;
    }

    const line = trimComment(raw.slice(ind));
    if (!line) {
      i++;
      continue;
    }

    const colon = line.indexOf(":");
    if (colon === -1) {
      throw new Error(`Invalid policy YAML: expected "key:" at line ${i + 1}`);
    }

    const key = line.slice(0, colon).trim();
    const rest = line.slice(colon + 1).trim();

    if (rest.length > 0) {
      o[key] = parseScalar(rest);
      i++;
      continue;
    }

    const next = lines[i + 1];
    if (!next) {
      o[key] = null;
      i++;
      continue;
    }

    const ni = getIndent(next);
    if (ni <= ind) {
      o[key] = null;
      i++;
      continue;
    }

    const nt = trimComment(next.slice(ni));
    if (nt.startsWith("- ")) {
      const { values, end } = parseArray(lines, i + 1, ni);
      o[key] = values;
      i = end;
    } else {
      const sub = parseSection(lines, i + 1, ni);
      o[key] = sub.obj;
      i = sub.end;
    }
  }

  return { obj: o, end: i };
}

function parseYamlDocument(content: string): Record<string, unknown> {
  const lines = content.split(/\r?\n/);
  const { obj } = parseSection(lines, 0, 0);
  return obj;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  return fallback;
}

function asString(v: unknown, fallback: string): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return fallback;
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  return fallback;
}

function normalizePolicy(raw: Record<string, unknown>): PolicyConfig {
  const complianceRaw =
    raw.compliance && typeof raw.compliance === "object" && !Array.isArray(raw.compliance)
      ? (raw.compliance as Record<string, unknown>)
      : {};

  const rulesRaw =
    raw.rules && typeof raw.rules === "object" && !Array.isArray(raw.rules)
      ? (raw.rules as Record<string, unknown>)
      : {};

  const ignoreRaw =
    raw.ignore && typeof raw.ignore === "object" && !Array.isArray(raw.ignore)
      ? (raw.ignore as Record<string, unknown>)
      : {};

  const notificationsRaw =
    raw.notifications &&
    typeof raw.notifications === "object" &&
    !Array.isArray(raw.notifications)
      ? (raw.notifications as Record<string, unknown>)
      : {};

  const enforcement = asString(
    complianceRaw.enforcement,
    DEFAULT_POLICY.compliance.enforcement
  ).toLowerCase();

  const enforcementNorm: PolicyEnforcement =
    enforcement === "blocking" || enforcement === "informational"
      ? enforcement
      : "warning";

  const pathsIgnore = ignoreRaw.paths;
  const modelsIgnore = ignoreRaw.models;

  return {
    version: asNumber(raw.version, DEFAULT_POLICY.version),
    compliance: {
      framework: asString(
        complianceRaw.framework,
        DEFAULT_POLICY.compliance.framework
      ),
      enforcement: enforcementNorm,
    },
    rules: {
      require_registration: asBool(
        rulesRaw.require_registration,
        DEFAULT_POLICY.rules.require_registration
      ),
      require_documentation:
        typeof rulesRaw.require_documentation === "boolean"
          ? rulesRaw.require_documentation
            ? ["documentation"]
            : []
          : asStringArray(rulesRaw.require_documentation),
      max_risk_tier_without_approval: asString(
        rulesRaw.max_risk_tier_without_approval,
        DEFAULT_POLICY.rules.max_risk_tier_without_approval
      ).toLowerCase(),
      auto_classify: asBool(rulesRaw.auto_classify, DEFAULT_POLICY.rules.auto_classify),
    },
    ignore: {
      paths: asStringArray(pathsIgnore),
      models: asStringArray(modelsIgnore),
    },
    notifications: {
      slack_channel:
        typeof notificationsRaw.slack_channel === "string"
          ? notificationsRaw.slack_channel
          : undefined,
      email:
        typeof notificationsRaw.email === "string" ? notificationsRaw.email : undefined,
    },
  };
}

/**
 * Parse policy YAML (or JSON) into a typed PolicyConfig.
 */
export function parsePolicyConfig(yamlContent: string): PolicyConfig {
  const trimmed = yamlContent.trim();
  if (!trimmed) {
    return { ...DEFAULT_POLICY, compliance: { ...DEFAULT_POLICY.compliance } };
  }

  let raw: Record<string, unknown>;
  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Policy JSON must be an object");
      }
      raw = parsed as Record<string, unknown>;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid JSON";
      throw new Error(`Policy parse error: ${msg}`);
    }
  } else {
    try {
      raw = parseYamlDocument(trimmed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid YAML";
      throw new Error(`Policy parse error: ${msg}`);
    }
  }

  return normalizePolicy(raw);
}

// ─── Glob / pattern helpers ─────────────────────────────────────────────────

/** Micromatch-style: `*`, `**`, `?`; case-insensitive; paths normalized to `/`. */
export function globMatch(path: string, pattern: string): boolean {
  try {
    return globToRegex(pattern).test(path.replace(/\\/g, "/"));
  } catch {
    return false;
  }
}

function globToRegex(pattern: string): RegExp {
  let p = pattern.trim().replace(/\\/g, "/");
  if (p.startsWith("./")) p = p.slice(2);

  let i = 0;
  let re = "";
  while (i < p.length) {
    const c = p[i]!;
    if (c === "*") {
      if (p[i + 1] === "*") {
        if (p[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 3;
          continue;
        }
        re += ".*";
        i += 2;
        continue;
      }
      re += "[^/]*";
      i++;
      continue;
    }
    if (c === "?") {
      re += "[^/]";
      i++;
      continue;
    }
    if ("\\.^$+()[]{}|".includes(c)) {
      re += "\\" + c;
      i++;
      continue;
    }
    re += c;
    i++;
  }
  return new RegExp(`^${re}$`, "i");
}

function pathIgnored(filePath: string, patterns: string[]): boolean {
  const norm = filePath.replace(/\\/g, "/");
  for (const pat of patterns) {
    if (globMatch(norm, pat)) return true;
  }
  return false;
}

function modelPatternMatches(name: string, patterns: string[]): boolean {
  const n = name.toLowerCase();
  for (const pat of patterns) {
    const p = pat.trim().toLowerCase();
    if (!p) continue;
    if (globMatch(n, p)) return true;
  }
  return false;
}

function violationSeverity(
  enforcement: PolicyEnforcement
): "error" | "warning" | "info" {
  if (enforcement === "blocking") return "error";
  if (enforcement === "warning") return "warning";
  return "info";
}

function isNoAiFinding(f: ScanFinding): boolean {
  return /no ai signals/i.test(f.name) || f.framework === "None detected";
}

/**
 * Evaluate scan findings against policy (registration, documentation, risk caps, ignores).
 * Registration is not verified against inventory in this two-argument form; enable
 * `require_registration` to flag findings that must be confirmed in ComplianceForge.
 */
export function evaluatePrCompliance(
  findings: ScanFinding[],
  policy: PolicyConfig
): ComplianceCheckResult {
  const violations: PolicyViolation[] = [];
  const sev = violationSeverity(policy.compliance.enforcement);
  const maxRank = riskRank(policy.rules.max_risk_tier_without_approval);

  for (const f of findings) {
    if (isNoAiFinding(f)) continue;

    const files = f.files.filter((p) => !pathIgnored(p, policy.ignore.paths));
    if (files.length === 0 && f.dependencies.length === 0 && !f.apiEndpoints?.length) {
      continue;
    }

    if (modelPatternMatches(f.name, policy.ignore.models)) continue;

    if (policy.rules.require_registration) {
      violations.push({
        rule: "require_registration",
        message: `Model or stack "${f.name}" must be registered in ComplianceForge (verify in inventory).`,
        severity: sev,
        details: {
          findingName: f.name,
          framework: f.framework,
          suggestedRiskTier: f.suggestedRiskTier,
          files: f.files,
        },
      });
    }

    if (policy.rules.require_documentation.length > 0) {
      for (const doc of policy.rules.require_documentation) {
        violations.push({
          rule: "require_documentation",
          message: `Required documentation "${doc}" is not verified for "${f.name}" (add or link in ComplianceForge).`,
          severity: sev,
          details: {
            documentType: doc,
            findingName: f.name,
            framework: f.framework,
          },
        });
      }
    }

    if (riskRank(f.suggestedRiskTier) > maxRank) {
      violations.push({
        rule: "max_risk_tier_without_approval",
        message: `Finding "${f.name}" suggests risk tier "${f.suggestedRiskTier}", above allowed "${policy.rules.max_risk_tier_without_approval}" without approval.`,
        severity: sev,
        details: {
          findingName: f.name,
          suggestedRiskTier: f.suggestedRiskTier,
          maxAllowed: policy.rules.max_risk_tier_without_approval,
        },
      });
    }

    if (!policy.rules.auto_classify) {
      violations.push({
        rule: "auto_classify",
        message: `auto_classify is disabled: confirm manual EU AI Act classification for "${f.name}".`,
        severity: sev,
        details: { findingName: f.name, framework: f.framework },
      });
    }
  }

  const blocking = policy.compliance.enforcement === "blocking";
  const passed = !(blocking && violations.length > 0);

  return {
    passed,
    violations,
    enforcement: policy.compliance.enforcement,
  };
}
