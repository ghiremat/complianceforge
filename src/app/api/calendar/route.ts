import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

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

  const enforcement = new Date("2026-08-02");

  const builtIn = [
    {
      id: "eu-enforcement",
      title: "EU AI Act Full Enforcement",
      description: "High-risk AI system requirements become mandatory",
      deadline_date: "2026-08-02",
      days_left: daysUntil(enforcement),
      priority: "high",
      status: "pending",
      category: "regulatory",
    },
    {
      id: "gpai-deadline",
      title: "GPAI Model Compliance Deadline",
      description: "General-purpose AI model obligations (passed)",
      deadline_date: "2025-08-02",
      days_left: daysUntil(new Date("2025-08-02")),
      priority: "high",
      status: daysUntil(new Date("2025-08-02")) < 0 ? "overdue" : "pending",
      category: "regulatory",
    },
    {
      id: "prohibited-deadline",
      title: "Prohibited AI Practices Ban",
      description: "Prohibited AI system practices enforcement (passed)",
      deadline_date: "2025-02-02",
      days_left: daysUntil(new Date("2025-02-02")),
      priority: "high",
      status: "overdue",
      category: "regulatory",
    },
  ];

  const custom = deadlines.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    deadline_date: d.dueDate.toISOString().slice(0, 10),
    days_left: daysUntil(d.dueDate),
    priority: d.priority,
    status: d.status,
    category: d.category,
  }));

  return NextResponse.json([...builtIn, ...custom]);
}
