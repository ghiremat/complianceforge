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

const createDeadlineSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  dueDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  priority: z.enum(["critical", "high", "medium", "low"]).optional().default("medium"),
  category: z.string().max(100).optional(),
  aiSystemId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }

    const deadlines = await db.complianceDeadline.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json(deadlines);
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

    const parsed = createDeadlineSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { title, description, dueDate, priority, category, aiSystemId } = parsed.data;

    if (aiSystemId) {
      const sys = await db.aiSystem.findFirst({
        where: { id: aiSystemId, organizationId: session.user.organizationId },
      });
      if (!sys) {
        return notFound("System");
      }
    }

    const deadline = await db.complianceDeadline.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: new Date(dueDate),
        priority,
        category: category?.trim() ? category.trim() : "general",
        organizationId: session.user.organizationId,
        aiSystemId: aiSystemId ?? null,
      },
    });

    return NextResponse.json(deadline, { status: 201 });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
