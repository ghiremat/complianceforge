import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-errors";
import { db } from "@/server/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }

    const { id: systemId } = await params;
    const system = await db.aiSystem.findFirst({
      where: { id: systemId, organizationId: session.user.organizationId },
    });
    if (!system) {
      return notFound("System");
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
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }

    const { id: systemId } = await params;
    const system = await db.aiSystem.findFirst({
      where: { id: systemId, organizationId: session.user.organizationId },
    });
    if (!system) {
      return notFound("System");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const b = body as {
      section: number;
      title: string;
      status: string;
      evidence: string;
    };

    const existing = await db.document.findFirst({
      where: { aiSystemId: systemId, type: "compliance_item", section: b.section },
    });

    if (existing) {
      const updated = await db.document.update({
        where: { id: existing.id },
        data: {
          status: b.status,
          content: b.evidence || existing.content,
        },
      });
      return NextResponse.json({ id: updated.id, status: updated.status });
    }

    const created = await db.document.create({
      data: {
        aiSystemId: systemId,
        authorId: session.user.id,
        title: b.title,
        type: "compliance_item",
        section: b.section,
        content: b.evidence || "",
        status: b.status,
      },
    });

    return NextResponse.json({ id: created.id, status: created.status }, { status: 201 });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
