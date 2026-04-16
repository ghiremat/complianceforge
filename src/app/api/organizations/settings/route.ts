import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json(org);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as { name?: string; slug?: string };
  const data: Record<string, string> = {};

  if (body.name?.trim()) data.name = body.name.trim();
  if (body.slug?.trim()) {
    const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    if (slug.length < 3) {
      return NextResponse.json({ error: "Slug must be at least 3 characters" }, { status: 400 });
    }
    const existing = await db.organization.findUnique({ where: { slug } });
    if (existing && existing.id !== session.user.organizationId) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
    data.slug = slug;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await db.organization.update({
    where: { id: session.user.organizationId },
    data,
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json(updated);
}
