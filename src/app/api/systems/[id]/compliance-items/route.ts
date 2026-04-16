import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: systemId } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: session.user.organizationId },
  });
  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  const docs = await db.document.findMany({
    where: { aiSystemId: systemId, type: "compliance_item" },
    orderBy: { section: "asc" },
  });

  return NextResponse.json(
    docs.map((d) => ({
      id: d.id,
      section: d.section,
      title: d.title,
      status: d.status,
      content: d.content,
      updatedAt: d.updatedAt,
    }))
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: systemId } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: session.user.organizationId },
  });
  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    section: number;
    title: string;
    status: string;
    evidence: string;
  };

  const existing = await db.document.findFirst({
    where: { aiSystemId: systemId, type: "compliance_item", section: body.section },
  });

  if (existing) {
    const updated = await db.document.update({
      where: { id: existing.id },
      data: {
        status: body.status,
        content: body.evidence || existing.content,
      },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  const created = await db.document.create({
    data: {
      aiSystemId: systemId,
      authorId: session.user.id,
      title: body.title,
      type: "compliance_item",
      section: body.section,
      content: body.evidence || "",
      status: body.status,
    },
  });

  return NextResponse.json({ id: created.id, status: created.status }, { status: 201 });
}
