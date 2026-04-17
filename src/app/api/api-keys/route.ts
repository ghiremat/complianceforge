import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/api-errors";
import { db } from "@/server/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }

    const keys = await db.apiKey.findMany({
      where: { organizationId: session.user.organizationId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(keys);
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }
    if (session.user.role !== "admin") {
      return forbidden("Admin access required");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const raw = body as { name?: string };
    const name = raw.name?.trim() || "API Key";

    const rawKey = `cf_live_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey, "utf8").digest("hex");
    const keyPrefix = rawKey.slice(0, 12);

    const key = await db.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json({ id: key.id, name: key.name, key: rawKey }, { status: 201 });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }
    if (session.user.role !== "admin") {
      return forbidden("Admin access required");
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");
    if (!keyId) {
      return badRequest("Missing key id");
    }

    const key = await db.apiKey.findFirst({
      where: { id: keyId, organizationId: session.user.organizationId },
    });
    if (!key) {
      return notFound("API key");
    }

    await db.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
