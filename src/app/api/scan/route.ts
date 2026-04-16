import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { scanRepositoryWithAI } from "@/lib/ai-provider";
import {
  NPM_AI_PACKAGES,
  PYTHON_AI_PACKAGES,
  type ScanFinding,
} from "@/lib/github-scanner";

export const runtime = "nodejs";

const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ComplianceForge-Scanner/1.0",
} as const;

const MODEL_EXTENSIONS = new Set([
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
]);

function parseGithubRepoUrl(urlStr: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(urlStr.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    let repo = parts[1];
    if (repo.endsWith(".git")) repo = repo.slice(0, -4);
    return { owner: parts[0], repo };
  } catch {
    return null;
  }
}

async function githubJson<T>(url: string): Promise<{ ok: boolean; data: T }> {
  const res = await fetch(url, { headers: GH_HEADERS, next: { revalidate: 0 } });
  const data = (await res.json()) as T;
  return { ok: res.ok, data };
}

async function fetchRepoDefaultBranch(owner: string, repo: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const { ok, data } = await githubJson<{ default_branch?: string; message?: string }>(url);
  if (!ok || !data.default_branch) return null;
  return data.default_branch;
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`;
  const { ok, data } = await githubJson<{
    type?: string;
    content?: string;
    encoding?: string;
    message?: string;
  }>(url);
  if (!ok || data.type !== "file" || typeof data.content !== "string") return null;
  const buf = Buffer.from(data.content.replace(/\n/g, ""), "base64");
  return buf.toString("utf-8");
}

function collectNpmDepNames(pkg: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): string[] {
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ];
}

function matchNpmAiPackage(dep: string): (typeof NPM_AI_PACKAGES)[number] | null {
  const d = dep.toLowerCase();
  for (const pkg of NPM_AI_PACKAGES) {
    const p = pkg.toLowerCase();
    if (d === p || d.startsWith(`${p}/`)) return pkg;
  }
  return null;
}

function extractRequirementsNames(content: string): string[] {
  const names: string[] = [];
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("-")) continue;
    const name = t.split(/[=<>![\s]/)[0]?.trim();
    if (name) names.push(name);
  }
  return names;
}

function matchPythonAiPackage(rawName: string): (typeof PYTHON_AI_PACKAGES)[number] | null {
  const key = rawName.trim().toLowerCase().replace(/_/g, "-");
  const aliases: Record<string, string> = {
    "scikit-learn": "sklearn",
  };
  const normalized = aliases[key] ?? key;
  for (const pkg of PYTHON_AI_PACKAGES) {
    const pl = pkg.toLowerCase();
    if (key === pl || normalized === pl) return pkg;
  }
  return null;
}

function findPyProjectAiPackages(content: string): (typeof PYTHON_AI_PACKAGES)[number][] {
  const found = new Set<(typeof PYTHON_AI_PACKAGES)[number]>();
  const lower = content.toLowerCase();
  for (const pkg of PYTHON_AI_PACKAGES) {
    const p = pkg.toLowerCase();
    if (
      lower.includes(`"${p}"`) ||
      lower.includes(`'${p}'`) ||
      new RegExp(`(^|[\\s,\\[])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[\\s=\\[<>!~,])`, "m").test(
        content
      )
    ) {
      found.add(pkg);
    }
  }
  return [...found];
}

async function listRepoModelPaths(
  owner: string,
  repo: string,
  branch: string
): Promise<string[]> {
  const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`;
  const { ok, data: commitData } = await githubJson<{
    commit?: { tree?: { sha?: string } };
    message?: string;
  }>(commitUrl);
  if (!ok || !commitData.commit?.tree?.sha) return [];

  const treeSha = commitData.commit.tree.sha;
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`;
  const { ok: treeOk, data: treeData } = await githubJson<{
    tree?: Array<{ path?: string; type?: string }>;
    truncated?: boolean;
  }>(treeUrl);
  if (!treeOk || !Array.isArray(treeData.tree)) return [];

  const paths: string[] = [];
  for (const entry of treeData.tree) {
    if (entry.type !== "blob" || !entry.path) continue;
    const lower = entry.path.toLowerCase();
    const dot = lower.lastIndexOf(".");
    if (dot < 0) continue;
    const ext = lower.slice(dot);
    if (MODEL_EXTENSIONS.has(ext)) paths.push(entry.path);
  }
  return paths;
}

function buildFindings(args: {
  npmHits: (typeof NPM_AI_PACKAGES)[number][];
  pythonPkgFiles: Map<(typeof PYTHON_AI_PACKAGES)[number], Set<string>>;
  modelPaths: string[];
}): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const pkg of args.npmHits) {
    findings.push({
      name: pkg,
      framework: "npm",
      files: ["package.json"],
      dependencies: [pkg],
      suggestedRiskTier: "high",
      suggestedSector: "Technology",
      confidence: 0.88,
    });
  }

  for (const [pkg, fileSet] of args.pythonPkgFiles) {
    const files = [...fileSet].sort();
    findings.push({
      name: pkg,
      framework: "pypi",
      files: files.length > 0 ? files : ["requirements.txt"],
      dependencies: [pkg],
      suggestedRiskTier: "high",
      suggestedSector: "Technology",
      confidence: 0.85,
    });
  }

  if (args.modelPaths.length > 0) {
    const capped = args.modelPaths.slice(0, 80);
    findings.push({
      name: "ML model artifacts",
      framework: "ml_model",
      files: capped,
      dependencies: [],
      suggestedRiskTier: "high",
      suggestedSector: "Technology",
      confidence: 0.72,
    });
  }

  return findings;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repoUrl?: string; systemId?: string };
  try {
    body = (await request.json()) as { repoUrl?: string; systemId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const repoUrl = typeof body.repoUrl === "string" ? body.repoUrl.trim() : "";
  if (!repoUrl) {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
  }

  const parsed = parseGithubRepoUrl(repoUrl);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid GitHub repository URL (expected https://github.com/owner/repo)" },
      { status: 400 }
    );
  }

  const { owner, repo } = parsed;
  const systemId = typeof body.systemId === "string" ? body.systemId.trim() : undefined;

  if (systemId) {
    const sys = await db.aiSystem.findFirst({
      where: { id: systemId, organizationId: session.user.organizationId },
    });
    if (!sys) {
      return NextResponse.json({ error: "System not found" }, { status: 404 });
    }
  }

  const branch = (await fetchRepoDefaultBranch(owner, repo)) ?? "main";

  const [packageJsonRaw, requirementsRaw, pyprojectRaw, modelPaths] = await Promise.all([
    fetchFileContent(owner, repo, "package.json", branch),
    fetchFileContent(owner, repo, "requirements.txt", branch),
    fetchFileContent(owner, repo, "pyproject.toml", branch),
    listRepoModelPaths(owner, repo, branch),
  ]);

  const npmHits: (typeof NPM_AI_PACKAGES)[number][] = [];
  if (packageJsonRaw) {
    try {
      const pkg = JSON.parse(packageJsonRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = collectNpmDepNames(pkg);
      const seen = new Set<string>();
      for (const d of deps) {
        const hit = matchNpmAiPackage(d);
        if (hit && !seen.has(hit)) {
          seen.add(hit);
          npmHits.push(hit);
        }
      }
    } catch {
      /* ignore malformed package.json */
    }
  }

  const pythonPkgFiles = new Map<(typeof PYTHON_AI_PACKAGES)[number], Set<string>>();
  function addPyFile(pkg: (typeof PYTHON_AI_PACKAGES)[number], file: string) {
    let set = pythonPkgFiles.get(pkg);
    if (!set) {
      set = new Set();
      pythonPkgFiles.set(pkg, set);
    }
    set.add(file);
  }
  if (requirementsRaw) {
    for (const n of extractRequirementsNames(requirementsRaw)) {
      const hit = matchPythonAiPackage(n);
      if (hit) addPyFile(hit, "requirements.txt");
    }
  }
  if (pyprojectRaw) {
    for (const hit of findPyProjectAiPackages(pyprojectRaw)) {
      addPyFile(hit, "pyproject.toml");
    }
  }

  const findings = buildFindings({ npmHits, pythonPkgFiles, modelPaths });
  const totalFindings = findings.length;
  const reviewRequired = findings.filter((f) => f.confidence < 0.75).length;

  const normalizedRepoUrl = `https://github.com/${owner}/${repo}`;

  const aiInput = findings.map((f) => ({
    name: f.name,
    framework: f.framework,
    files: f.files,
    dependencies: f.dependencies,
    suggestedRiskTier: f.suggestedRiskTier,
    confidence: f.confidence,
  }));

  let aiAnalysis;
  try {
    aiAnalysis = await scanRepositoryWithAI(normalizedRepoUrl, aiInput);
  } catch (e) {
    console.error("scanRepositoryWithAI error:", e);
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 500 }
    );
  }

  const findingsJson = JSON.stringify(findings);

  const scanResult = await db.scanResult.create({
    data: {
      repository: normalizedRepoUrl,
      branch,
      findings: findingsJson,
      totalFindings,
      reviewRequired,
      scannedById: session.user.id,
      organizationId: session.user.organizationId,
      aiSystemId: systemId ?? null,
    },
  });

  return NextResponse.json({
    scan: {
      id: scanResult.id,
      repository: scanResult.repository,
      branch: scanResult.branch,
      totalFindings: scanResult.totalFindings,
      reviewRequired: scanResult.reviewRequired,
      findings,
      aiAnalysis,
    },
  });
}
