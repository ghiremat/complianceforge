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

type RouteParams = { params: Promise<{ id: string }> };

const updateIncidentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["open", "investigating", "mitigating", "resolved", "closed"]).optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }

    const { id } = await params;
    const incident = await db.incident.findFirst({
      where: { id },
      include: { aiSystem: { select: { organizationId: true } } },
    });

    if (!incident || incident.aiSystem.organizationId !== session.user.organizationId) {
      return notFound("Incident");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const parsed = updateIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.severity !== undefined) data.severity = parsed.data.severity;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;

    if (Object.keys(data).length === 0) {
      return badRequest("No changes");
    }

    const updated = await db.incident.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        aiSystemId: incident.aiSystemId,
        action: "update",
        resource: "incident",
        resourceId: id,
        details: JSON.stringify(data),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
