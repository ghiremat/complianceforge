import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deadlines = await db.complianceDeadline.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(deadlines);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    title: string;
    description?: string;
    dueDate: string;
    priority?: string;
    category?: string;
  };

  if (!body.title?.trim() || !body.dueDate) {
    return NextResponse.json({ error: "Title and due date are required" }, { status: 400 });
  }

  const deadline = await db.complianceDeadline.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      dueDate: new Date(body.dueDate),
      priority: body.priority || "medium",
      category: body.category || "general",
      organizationId: session.user.organizationId,
    },
  });

  return NextResponse.json(deadline, { status: 201 });
}
