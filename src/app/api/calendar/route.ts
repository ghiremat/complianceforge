import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { EU_AI_ACT_TIMELINE } from "@/lib/eu-ai-act";

function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json([], { status: 200 });
  }

  const deadlines = await db.complianceDeadline.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { dueDate: "asc" },
    take: 20,
  });

  const regulatory = EU_AI_ACT_TIMELINE.map((m) => {
    const date = new Date(m.date);
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      dueDate: m.date,
      days_left: daysUntil(date),
      priority: m.status === "upcoming" ? "high" : m.status === "passed" ? "low" : "medium",
      category: "regulatory",
      status: m.status === "passed" ? "overdue" : "pending",
      article: m.article,
    };
  });

  const custom = deadlines.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    dueDate: d.dueDate.toISOString().slice(0, 10),
    days_left: daysUntil(d.dueDate),
    priority: d.priority,
    status: d.status,
    category: d.category,
  }));

  return NextResponse.json([...regulatory, ...custom]);
}
