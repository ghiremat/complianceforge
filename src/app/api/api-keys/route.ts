import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { randomBytes, createHash } from "node:crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim() || "API Key";

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
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");
  if (!keyId) {
    return NextResponse.json({ error: "Missing key id" }, { status: 400 });
  }

  const key = await db.apiKey.findFirst({
    where: { id: keyId, organizationId: session.user.organizationId },
  });
  if (!key) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  await db.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
