import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  badRequest,
  notFound,
  serverError,
  unauthorized,
  validationError,
} from "@/lib/api-errors";
import { db } from "@/server/db";

const createIncidentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  aiSystemId: z.string().uuid(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get("systemId");

    const where = {
      aiSystem: { organizationId: session.user.organizationId },
      ...(systemId ? { aiSystemId: systemId } : {}),
    };

    const incidents = await db.incident.findMany({
      where,
      include: {
        aiSystem: { select: { name: true } },
        reporter: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      incidents.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        severity: i.severity,
        status: i.status,
        systemId: i.aiSystemId,
        systemName: i.aiSystem.name,
        reportedBy: i.reporter.name || i.reporter.email || "Unknown",
        resolvedAt: i.status === "resolved" ? i.updatedAt : null,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }))
    );
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const parsed = createIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { title, description, severity, aiSystemId } = parsed.data;

    const system = await db.aiSystem.findFirst({
      where: { id: aiSystemId, organizationId: session.user.organizationId },
    });
    if (!system) {
      return notFound("System");
    }

    const now = new Date();
    const incident = await db.incident.create({
      data: {
        title: title.trim(),
        description: description?.trim() ?? "",
        severity,
        status: "open",
        aiSystemId,
        reporterId: session.user.id,
        occurredAt: now,
        detectedAt: now,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        aiSystemId,
        action: "create",
        resource: "incident",
        resourceId: incident.id,
        details: JSON.stringify({ title: incident.title, severity: incident.severity }),
      },
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
