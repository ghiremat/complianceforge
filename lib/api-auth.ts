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

  if (raw.length < 12) {
    return { ok: false, response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }

  const prefix = raw.slice(0, 12);
  const digest = hashKey(raw);

  const apiKey = await db.apiKey.findFirst({
    where: { keyPrefix: prefix, revokedAt: null },
    select: {
      id: true,
      keyHash: true,
      organizationId: true,
      organization: { select: { id: true, name: true } },
    },
  });

  let valid = false;
  if (apiKey) {
    try {
      const a = Buffer.from(digest, "hex");
      const b = Buffer.from(apiKey.keyHash, "hex");
      valid = a.length === b.length && timingSafeEqual(a, b);
    } catch {
      valid = false;
    }
  }

  if (!valid || !apiKey) {
    return { ok: false, response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }

  void db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    ok: true,
    ctx: {
      organization: { id: apiKey.organization.id, name: apiKey.organization.name },
      apiKeyId: apiKey.id,
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
