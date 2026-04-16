import {
  NPM_AI_PACKAGES,
  PYTHON_AI_PACKAGES,
  type RepositoryScanResult,
  type ScanFinding,
} from "@/lib/github-scanner";

/** Mirrors github-scanner model artifact extensions (not exported from scanner). */
const MODEL_FILE_EXTENSIONS = [
  ".onnx",
  ".pt",
  ".pth",
  ".h5",
  ".hdf5",
  ".pkl",
  ".joblib",
  ".safetensors",
  ".bin",
  ".pb",
  ".tflite",
  ".mlmodel",
  ".pmml",
  ".gguf",
  ".ggml",
  ".q4_0",
  ".q8_0",
] as const;

const DATASET_EXTENSIONS = [".csv", ".parquet", ".jsonl", ".feather", ".arrow"] as const;

function normalizePkgName(name: string): string {
  return name.trim().toLowerCase().replace(/_/g, "-");
}

function pathLooksLikeModelFile(path: string): boolean {
  const lower = path.toLowerCase();
  for (const ext of MODEL_FILE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function pathLooksLikeDatasetFile(path: string): boolean {
  const lower = path.toLowerCase();
  for (const ext of DATASET_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function basename(p: string): string {
  const parts = p.split(/[/\\]/);
  return parts[parts.length - 1] ?? p;
}

function modelTypeFromPath(path: string): string {
  const lower = path.toLowerCase();
  for (const ext of MODEL_FILE_EXTENSIONS) {
    if (lower.endsWith(ext)) return ext.slice(1);
  }
  return "artifact";
}

function npmIsAiRelated(packageName: string): boolean {
  const lower = packageName.toLowerCase();
  for (const sig of NPM_AI_PACKAGES) {
    if (lower === sig.toLowerCase() || lower.startsWith(sig.toLowerCase() + "/")) {
      return true;
    }
  }
  return false;
}

function pypiIsAiRelated(normalizedName: string): boolean {
  for (const sig of PYTHON_AI_PACKAGES) {
    if (normalizePkgName(sig) === normalizedName) return true;
  }
  return false;
}

function parseDependencyLabel(
  label: string
): { name: string; source: "pypi" | "npm" } | { env: string } | null {
  const m = label.match(/^(.+?)\s*\((pypi|npm|env)\)\s*$/i);
  if (!m?.[1] || !m[2]) return null;
  const raw = m[1].trim();
  const kind = m[2].toLowerCase();
  if (kind === "env") return { env: raw };
  return { name: raw, source: kind as "pypi" | "npm" };
}

export interface AiBomDataset {
  name: string;
  type: string;
  path?: string;
  license?: string;
}

export interface AiBomInfrastructure {
  apiEndpoints: string[];
  environmentVariables: string[];
}

export interface AiBomData {
  version: string;
  system: string;
  generatedAt: string;
  models: AiBomModel[];
  datasets: AiBomDataset[];
  dependencies: AiBomDependency[];
  infrastructure: AiBomInfrastructure;
}

export interface AiBomModel {
  name: string;
  type: string;
  provider: string;
  version?: string;
  framework: string;
  license?: string;
}

export interface AiBomDependency {
  name: string;
  version?: string;
  source: "pypi" | "npm";
  isAiRelated: boolean;
  license?: string;
}

export type BomComponentRow = {
  componentType: string;
  name: string;
  version?: string;
  provider?: string;
  license?: string;
  source?: string;
  metadata: string;
};

export function generateBomFromScan(
  scanResult: RepositoryScanResult,
  systemName: string
): AiBomData {
  const models: AiBomModel[] = [];
  const modelKeys = new Set<string>();
  const datasets: AiBomDataset[] = [];
  const datasetKeys = new Set<string>();
  const dependencies: AiBomDependency[] = [];
  const depKeys = new Set<string>();
  const apiEndpoints = new Set<string>();
  const envVars = new Set<string>();

  for (const finding of scanResult.findings) {
    for (const file of finding.files) {
      if (pathLooksLikeModelFile(file)) {
        const key = file;
        if (modelKeys.has(key)) continue;
        modelKeys.add(key);
        models.push({
          name: basename(file),
          type: modelTypeFromPath(file),
          provider: "internal",
          framework: finding.framework,
          license: undefined,
        });
      } else if (pathLooksLikeDatasetFile(file)) {
        const key = file;
        if (datasetKeys.has(key)) continue;
        datasetKeys.add(key);
        datasets.push({
          name: basename(file),
          type: "tabular",
          path: file,
        });
      }
    }

    for (const depLabel of finding.dependencies) {
      const parsed = parseDependencyLabel(depLabel);
      if (!parsed) continue;
      if ("env" in parsed) {
        envVars.add(parsed.env);
        continue;
      }
      const { name, source } = parsed;
      const key = `${source}:${normalizePkgName(name)}`;
      if (depKeys.has(key)) continue;
      depKeys.add(key);
      const norm = normalizePkgName(name);
      const isAiRelated = source === "pypi" ? pypiIsAiRelated(norm) : npmIsAiRelated(name);
      dependencies.push({
        name,
        version: undefined,
        source,
        isAiRelated,
        license: undefined,
      });
    }

    for (const ep of finding.apiEndpoints ?? []) {
      apiEndpoints.add(ep);
    }
  }

  return {
    version: "1.0",
    system: systemName,
    generatedAt: new Date().toISOString(),
    models,
    datasets,
    dependencies,
    infrastructure: {
      apiEndpoints: [...apiEndpoints],
      environmentVariables: [...envVars],
    },
  };
}

export function bomToComponents(bom: AiBomData): BomComponentRow[] {
  const rows: BomComponentRow[] = [];

  for (const m of bom.models) {
    rows.push({
      componentType: "model",
      name: m.name,
      version: m.version,
      provider: m.provider,
      license: m.license,
      source: "internal",
      metadata: JSON.stringify({
        type: m.type,
        framework: m.framework,
      }),
    });
  }

  for (const d of bom.dependencies) {
    rows.push({
      componentType: "dependency",
      name: d.name,
      version: d.version,
      provider: undefined,
      license: d.license,
      source: d.source,
      metadata: JSON.stringify({ isAiRelated: d.isAiRelated }),
    });
  }

  for (const ds of bom.datasets) {
    rows.push({
      componentType: "dataset",
      name: ds.name,
      version: undefined,
      provider: undefined,
      license: ds.license,
      source: undefined,
      metadata: JSON.stringify({ type: ds.type, path: ds.path }),
    });
  }

  for (const host of bom.infrastructure.apiEndpoints) {
    rows.push({
      componentType: "infrastructure",
      name: host,
      version: undefined,
      provider: undefined,
      license: undefined,
      source: "vendor",
      metadata: JSON.stringify({ kind: "api_endpoint", host }),
    });
  }

  for (const ev of bom.infrastructure.environmentVariables) {
    rows.push({
      componentType: "infrastructure",
      name: ev,
      version: undefined,
      provider: undefined,
      license: undefined,
      source: "internal",
      metadata: JSON.stringify({ kind: "environment_variable", variable: ev }),
    });
  }

  return rows;
}

function yamlIndent(lines: string[], indent: string): string {
  return lines.map((l) => (l ? `${indent}${l}` : "")).join("\n");
}

function yamlEscapeScalar(value: string): string {
  if (value === "") return '""';
  if (/[\n:#]/.test(value) || /^[\s@]/.test(value) || /^\d/.test(value)) {
    return JSON.stringify(value);
  }
  if (/["'\\]/.test(value)) return JSON.stringify(value);
  return value;
}

export function exportBomAsYaml(bom: AiBomData): string {
  const lines: string[] = [];
  lines.push(`version: ${yamlEscapeScalar(bom.version)}`);
  lines.push(`system: ${yamlEscapeScalar(bom.system)}`);
  lines.push(`generatedAt: ${yamlEscapeScalar(bom.generatedAt)}`);
  lines.push("");

  lines.push("models:");
  if (bom.models.length === 0) {
    lines.push("  []");
  } else {
    for (const m of bom.models) {
      lines.push("  -");
      lines.push(
        yamlIndent(
          [
            `name: ${yamlEscapeScalar(m.name)}`,
            `type: ${yamlEscapeScalar(m.type)}`,
            `provider: ${yamlEscapeScalar(m.provider)}`,
            `framework: ${yamlEscapeScalar(m.framework)}`,
            ...(m.version ? [`version: ${yamlEscapeScalar(m.version)}`] : []),
            ...(m.license ? [`license: ${yamlEscapeScalar(m.license)}`] : []),
          ],
          "    "
        )
      );
    }
  }
  lines.push("");

  lines.push("datasets:");
  if (bom.datasets.length === 0) {
    lines.push("  []");
  } else {
    for (const d of bom.datasets) {
      lines.push("  -");
      lines.push(
        yamlIndent(
          [
            `name: ${yamlEscapeScalar(d.name)}`,
            `type: ${yamlEscapeScalar(d.type)}`,
            ...(d.path ? [`path: ${yamlEscapeScalar(d.path)}`] : []),
            ...(d.license ? [`license: ${yamlEscapeScalar(d.license)}`] : []),
          ],
          "    "
        )
      );
    }
  }
  lines.push("");

  lines.push("dependencies:");
  if (bom.dependencies.length === 0) {
    lines.push("  []");
  } else {
    for (const d of bom.dependencies) {
      lines.push("  -");
      lines.push(
        yamlIndent(
          [
            `name: ${yamlEscapeScalar(d.name)}`,
            `source: ${yamlEscapeScalar(d.source)}`,
            `isAiRelated: ${d.isAiRelated}`,
            ...(d.version ? [`version: ${yamlEscapeScalar(d.version)}`] : []),
            ...(d.license ? [`license: ${yamlEscapeScalar(d.license)}`] : []),
          ],
          "    "
        )
      );
    }
  }
  lines.push("");

  lines.push("infrastructure:");
  lines.push("  apiEndpoints:");
  if (bom.infrastructure.apiEndpoints.length === 0) {
    lines.push("    []");
  } else {
    for (const h of bom.infrastructure.apiEndpoints) {
      lines.push(`    - ${yamlEscapeScalar(h)}`);
    }
  }
  lines.push("  environmentVariables:");
  if (bom.infrastructure.environmentVariables.length === 0) {
    lines.push("    []");
  } else {
    for (const v of bom.infrastructure.environmentVariables) {
      lines.push(`    - ${yamlEscapeScalar(v)}`);
    }
  }

  return lines.join("\n");
}

export function exportBomAsCycloneDx(bom: AiBomData): Record<string, unknown> {
  const components: Record<string, unknown>[] = [];

  for (const m of bom.models) {
    components.push({
      type: "machine-learning-model",
      name: m.name,
      version: m.version ?? "unknown",
      description: `Framework: ${m.framework}; type: ${m.type}`,
    });
  }

  for (const d of bom.dependencies) {
    components.push({
      type: "library",
      name: d.name,
      version: d.version ?? "unknown",
      description: `Source: ${d.source}; aiRelated: ${d.isAiRelated}`,
    });
  }

  for (const ds of bom.datasets) {
    components.push({
      type: "data",
      name: ds.name,
      version: "unknown",
      description: ds.path ? `Path: ${ds.path}` : `Type: ${ds.type}`,
    });
  }

  for (const host of bom.infrastructure.apiEndpoints) {
    components.push({
      type: "service",
      name: host,
      version: "unknown",
      description: "External AI / API endpoint",
    });
  }

  for (const ev of bom.infrastructure.environmentVariables) {
    components.push({
      type: "library",
      name: ev,
      version: "unknown",
      description: "Environment configuration signal (variable name only)",
    });
  }

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: {
      component: {
        name: bom.system,
        type: "application",
        version: bom.version,
      },
    },
    components,
  };
}

type StoredComponent = {
  componentType: string;
  name: string;
  version: string | null;
  provider: string | null;
  license: string | null;
  source: string | null;
  metadata: string;
};

/** Rebuilds AiBomData from persisted BOM header + flat components (for export). */
export function aiBomDataFromStored(
  systemName: string,
  bom: { version: string; generatedAt: Date },
  components: StoredComponent[]
): AiBomData {
  const models: AiBomModel[] = [];
  const datasets: AiBomDataset[] = [];
  const dependencies: AiBomDependency[] = [];
  const apiEndpoints: string[] = [];
  const environmentVariables: string[] = [];

  for (const c of components) {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(c.metadata || "{}") as Record<string, unknown>;
    } catch {
      meta = {};
    }

    if (c.componentType === "model") {
      models.push({
        name: c.name,
        type: typeof meta.type === "string" ? meta.type : "artifact",
        provider: c.provider ?? "internal",
        version: c.version ?? undefined,
        framework: typeof meta.framework === "string" ? meta.framework : "Unknown",
        license: c.license ?? undefined,
      });
    } else if (c.componentType === "dependency") {
      const src = c.source === "pypi" || c.source === "npm" ? c.source : "pypi";
      dependencies.push({
        name: c.name,
        version: c.version ?? undefined,
        source: src,
        isAiRelated: Boolean(meta.isAiRelated),
        license: c.license ?? undefined,
      });
    } else if (c.componentType === "dataset") {
      datasets.push({
        name: c.name,
        type: typeof meta.type === "string" ? meta.type : "dataset",
        path: typeof meta.path === "string" ? meta.path : undefined,
        license: c.license ?? undefined,
      });
    } else if (c.componentType === "infrastructure") {
      if (meta.kind === "api_endpoint" && typeof meta.host === "string") {
        apiEndpoints.push(meta.host);
      } else if (meta.kind === "environment_variable" && typeof meta.variable === "string") {
        environmentVariables.push(meta.variable);
      } else {
        apiEndpoints.push(c.name);
      }
    }
  }

  return {
    version: bom.version,
    system: systemName,
    generatedAt: bom.generatedAt.toISOString(),
    models,
    datasets,
    dependencies,
    infrastructure: {
      apiEndpoints: [...new Set(apiEndpoints)],
      environmentVariables: [...new Set(environmentVariables)],
    },
  };
}

function parseScanFindingsJson(raw: string): ScanFinding[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as ScanFinding[]) : [];
  } catch {
    return [];
  }
}

export function repositoryScanResultFromStored(
  repository: string,
  branch: string,
  findingsRaw: string
): RepositoryScanResult {
  const findings = parseScanFindingsJson(findingsRaw);
  return {
    repository,
    branch,
    findings,
    totalFindings: findings.length,
    reviewRequired: findings.filter((f) => f.confidence < 0.75).length,
    errors: [],
  };
}
