import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serverError,
  unauthorized,
  validationError,
} from "@/lib/api-errors";
import { db } from "@/server/db";

function normalizeOrgSlug(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }

    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        maxSystems: true,
        _count: { select: { aiSystems: true, users: true } },
      },
    });

    if (!org) {
      return notFound("Organization");
    }

    return NextResponse.json(org);
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function PATCH(request: Request) {
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

    if (body && typeof body === "object" && !Array.isArray(body)) {
      const o = body as Record<string, unknown>;
      if (typeof o.slug === "string") {
        const n = normalizeOrgSlug(o.slug);
        o.slug = n === "" ? undefined : n;
      }
    }

    const parsed = updateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const data: Record<string, string> = {};

    if (parsed.data.name?.trim()) data.name = parsed.data.name.trim();
    if (parsed.data.slug !== undefined) {
      const slug = parsed.data.slug;
      const existing = await db.organization.findUnique({ where: { slug } });
      if (existing && existing.id !== session.user.organizationId) {
        return conflict("Slug already taken");
      }
      data.slug = slug;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No changes");
    }

    const updated = await db.organization.update({
      where: { id: session.user.organizationId },
      data,
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
