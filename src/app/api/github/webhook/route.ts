import { NextResponse } from "next/server";
import { createHmac, createPrivateKey, sign, timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import {
  evaluatePrCompliance,
  parsePolicyConfig,
  type PolicyViolation,
} from "@/lib/policy-engine";
import type { ScanFinding } from "@/lib/github-scanner";

export const runtime = "nodejs";

const MODEL_EXTENSIONS = [
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
] as const;

function verifyGithubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const receivedHex = signatureHeader.slice("sha256=".length);
  const expectedHex = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(receivedHex, "hex"));
  } catch {
    return false;
  }
}

function createAppJwt(appId: string, pem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url"
  );
  const payload = Buffer.from(
    JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: appId })
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const key = createPrivateKey({ key: pem, format: "pem" });
  const sig = sign("RSA-SHA256", Buffer.from(data), key);
  return `${data}.${sig.toString("base64url")}`;
}

async function getInstallationAccessToken(installationId: number): Promise<string | null> {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const rawPem = process.env.GITHUB_APP_PRIVATE_KEY?.trim();
  if (!appId || !rawPem) return null;
  const pem = rawPem.replace(/\\n/g, "\n");
  let jwt: string;
  try {
    jwt = createAppJwt(appId, pem);
  } catch {
    return null;
  }
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { token?: string };
  return typeof json.token === "string" ? json.token : null;
}

type GithubPullRequestFile = { filename?: string };

async function listPullRequestChangedFiles(payload: PullRequestPayload): Promise<string[]> {
  const fromPayload = extractFilesFromPayload(payload);
  if (fromPayload.length > 0) return fromPayload;

  const installationGithubId = payload.installation?.id;
  const owner = payload.repository?.owner?.login;
  const repo = payload.repository?.name;
  const number = payload.pull_request?.number;
  if (!installationGithubId || !owner || !repo || number == null) return [];

  const token = await getInstallationAccessToken(installationGithubId);
  if (!token) return [];

  const files: string[] = [];
  let page = 1;
  const perPage = 100;
  for (;;) {
    const url = new URL(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files`
    );
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) break;
    const batch = (await res.json()) as GithubPullRequestFile[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const f of batch) {
      if (typeof f.filename === "string" && f.filename) files.push(f.filename);
    }
    if (batch.length < perPage) break;
    page++;
  }
  return files;
}

function extractFilesFromPayload(payload: PullRequestPayload): string[] {
  const pr = payload.pull_request;
  if (!pr || !Array.isArray(pr.files)) return [];
  const out: string[] = [];
  for (const f of pr.files) {
    if (f && typeof f === "object" && typeof f.filename === "string" && f.filename) {
      out.push(f.filename);
    }
  }
  return out;
}

function pathLooksLikeMlRelated(path: string): boolean {
  const lower = path.toLowerCase();
  const base = path.split("/").pop() ?? "";
  if (base === "requirements.txt" || base === "package.json") return true;
  for (const ext of MODEL_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function findingsFromPrFiles(changedFiles: string[], repoFullName: string): ScanFinding[] {
  const mlFiles = changedFiles.filter(pathLooksLikeMlRelated);
  if (changedFiles.length === 0) {
    return [
      {
        name: `${repoFullName} — PR diff (no file list)`,
        framework: "Unknown",
        files: [],
        dependencies: [],
        suggestedRiskTier: "unassessed",
        suggestedSector: "Other",
        confidence: 0.25,
        suggestedUseCase: "Configure GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY to list PR files via the GitHub API.",
      },
    ];
  }
  if (mlFiles.length === 0) {
    return [
      {
        name: `${repoFullName} — No AI signals in PR diff`,
        framework: "None detected",
        files: [],
        dependencies: [],
        suggestedRiskTier: "minimal",
        suggestedSector: "Other",
        confidence: 0.45,
      },
    ];
  }
  const hasModelArtifact = mlFiles.some((p) => {
    const l = p.toLowerCase();
    return MODEL_EXTENSIONS.some((e) => l.endsWith(e));
  });
  return [
    {
      name: `${repoFullName} — ML-related PR changes`,
      framework: "Inferred from changed files",
      files: mlFiles,
      dependencies: [],
      suggestedRiskTier: hasModelArtifact ? "limited" : "unassessed",
      suggestedSector: "Other",
      confidence: 0.6,
    },
  ];
}

function resolveConclusion(args: {
  policyViolations: PolicyViolation[];
  policyPassed: boolean;
  mlTouchCount: number;
  installEnforcement: string;
}): "success" | "failure" | "action_required" {
  const inst = args.installEnforcement.toLowerCase();
  if (!args.policyPassed) return "failure";
  if (inst === "blocking" && args.mlTouchCount > 0) return "failure";
  if (args.policyViolations.length > 0) return "action_required";
  if (inst === "warning" && args.mlTouchCount > 0) return "action_required";
  return "success";
}

type InstallationPayload = {
  id?: number;
  account?: { login?: string; type?: string };
  repositories?: { full_name?: string }[];
};

type PullRequestPayload = {
  action?: string;
  installation?: { id?: number };
  sender?: { login?: string };
  repository?: {
    owner?: { login?: string };
    name?: string;
    full_name?: string;
  };
  pull_request?: {
    number?: number;
    files?: GithubPullRequestFile[];
    head?: { sha?: string };
  };
};

async function resolveOrganizationForGithubAccount(login: string | undefined) {
  if (!login?.trim()) return null;
  const trimmed = login.trim();
  return db.organization.findFirst({
    where: {
      OR: [
        { slug: { equals: trimmed, mode: "insensitive" } },
        { name: { equals: trimmed, mode: "insensitive" } },
      ],
    },
  });
}

async function handleInstallationEvent(payload: {
  action?: string;
  installation?: InstallationPayload;
  sender?: { login?: string };
}) {
  const action = payload.action;
  const inst = payload.installation;
  const githubInstId = inst?.id;
  if (!inst || githubInstId == null) {
    return NextResponse.json({ ok: true, skipped: "missing_installation_id" });
  }

  if (action === "deleted") {
    await db.gitHubInstallation.updateMany({
      where: { installationId: githubInstId },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "created") {
    const login = inst.account?.login ?? payload.sender?.login ?? "";
    const org = await resolveOrganizationForGithubAccount(login);
    if (!org) {
      return NextResponse.json({ ok: true, skipped: "organization_not_found", login });
    }

    const repos =
      Array.isArray(inst.repositories) && inst.repositories.length > 0
        ? inst.repositories
            .map((r) => r.full_name)
            .filter((n): n is string => typeof n === "string" && n.length > 0)
        : [];

    await db.gitHubInstallation.upsert({
      where: { installationId: githubInstId },
      create: {
        installationId: githubInstId,
        accountLogin: login || "unknown",
        accountType: inst.account?.type ?? "Organization",
        organizationId: org.id,
        repositories: JSON.stringify(repos),
        isActive: true,
      },
      update: {
        accountLogin: login || "unknown",
        accountType: inst.account?.type ?? "Organization",
        repositories: JSON.stringify(repos),
        isActive: true,
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, skipped: "installation_action_unhandled" }, { status: 202 });
}

async function handlePullRequestEvent(payload: PullRequestPayload) {
  const action = payload.action;
  if (action !== "opened" && action !== "synchronize") {
    return null;
  }

  const githubInstId = payload.installation?.id;
  if (githubInstId == null) {
    return NextResponse.json({ ok: true, skipped: "missing_installation" });
  }

  const installation = await db.gitHubInstallation.findUnique({
    where: { installationId: githubInstId },
  });
  if (!installation?.isActive) {
    return NextResponse.json({ ok: true, skipped: "installation_inactive" });
  }

  const repoFull =
    payload.repository?.full_name ??
    (payload.repository?.owner?.login && payload.repository?.name
      ? `${payload.repository.owner.login}/${payload.repository.name}`
      : null);
  const headSha = payload.pull_request?.head?.sha ?? "unknown";
  const prNumber = payload.pull_request?.number ?? 0;

  if (!repoFull || prNumber === 0) {
    return NextResponse.json({ ok: true, skipped: "missing_pr_metadata" });
  }

  const changedFiles = await listPullRequestChangedFiles(payload);
  const mlTouches = changedFiles.filter(pathLooksLikeMlRelated);
  const modelsDetected = mlTouches.filter((p) => {
    const l = p.toLowerCase();
    return MODEL_EXTENSIONS.some((e) => l.endsWith(e));
  }).length;

  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  const run = await db.ciCheckRun.create({
    data: {
      installationId: installation.id,
      repository: repoFull,
      prNumber,
      headSha,
      status: "pending",
    },
  });

  let violations: PolicyViolation[] = [];
  let policyPassed = true;
  try {
    if (installation.policyConfig?.trim()) {
      const policy = parsePolicyConfig(installation.policyConfig);
      const findings = findingsFromPrFiles(changedFiles, repoFull);
      const result = evaluatePrCompliance(findings, policy);
      violations = result.violations;
      policyPassed = result.passed;
    }
  } catch (e) {
    violations = [
      {
        rule: "policy_parse",
        severity: "warning",
        message: e instanceof Error ? e.message : "Invalid policy configuration",
        details: {},
      },
    ];
  }

  const conclusion = resolveConclusion({
    policyViolations: violations,
    policyPassed,
    mlTouchCount: mlTouches.length,
    installEnforcement: installation.enforcement,
  });

  const issuesFound = violations.length + (mlTouches.length > 0 ? 1 : 0);
  const detailsUrl = baseUrl ? `${baseUrl}/api/github/check-runs/${run.id}` : null;

  const findingsPayload = {
    changedFiles,
    mlTouches,
    policyViolations: violations,
    conclusion,
  };

  await db.ciCheckRun.update({
    where: { id: run.id },
    data: {
      status: "completed",
      conclusion,
      modelsDetected,
      issuesFound,
      detailsUrl: detailsUrl ?? undefined,
      findings: JSON.stringify(findingsPayload),
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, checkRunId: run.id, conclusion });
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[github webhook] GITHUB_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get("x-hub-signature-256");
  if (!verifyGithubSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event") ?? "";

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;

  try {
    if (event === "installation") {
      const res = await handleInstallationEvent(body as { action?: string; installation?: InstallationPayload });
      return res;
    }

    if (event === "pull_request") {
      const res = await handlePullRequestEvent(body as PullRequestPayload);
      if (res) return res;
    }

    return NextResponse.json({ ok: true, ignored: event || "unknown" }, { status: 202 });
  } catch (e) {
    console.error("[github webhook]", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
