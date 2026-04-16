import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

export type ApiAuthContext = {
  organization: { id: string; name: string };
  apiKeyId: string;
};

export type ValidateApiKeyResult =
  | { ok: true; ctx: ApiAuthContext }
  | { ok: false; response: NextResponse };

function hashKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function extractBearer(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (h?.startsWith("Bearer ")) {
    const t = h.slice(7).trim();
    return t || null;
  }
  const x = request.headers.get("x-api-key")?.trim();
  return x || null;
}

export async function validateApiKey(request: Request): Promise<ValidateApiKeyResult> {
  const raw = extractBearer(request);
  if (!raw) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing API key" }, { status: 401 }),
    };
  }

  const digest = hashKey(raw);
  const keys = await db.apiKey.findMany({
    where: { revokedAt: null },
    select: {
      id: true,
      keyHash: true,
      organizationId: true,
      organization: { select: { id: true, name: true } },
    },
  });

  const match = keys.find((k: (typeof keys)[number]) => {
    try {
      const a = Buffer.from(digest, "hex");
      const b = Buffer.from(k.keyHash, "hex");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });

  if (!match) {
    return { ok: false, response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }

  void db.apiKey
    .update({
      where: { id: match.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    ok: true,
    ctx: {
      organization: { id: match.organization.id, name: match.organization.name },
      apiKeyId: match.id,
    },
  };
}

/** First org user for attributing writes (documents, assessments) when using API keys. */
export async function getOrganizationActorUserId(organizationId: string): Promise<string | null> {
  const u = await db.user.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return u?.id ?? null;
}
