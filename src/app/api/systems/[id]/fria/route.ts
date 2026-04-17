import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-errors";
import { db } from "@/server/db";

export const maxDuration = 30;

type RouteParams = { params: Promise<{ id: string }> };

interface FriaSection {
  id: string;
  title: string;
  article: string;
  questions: string[];
}

const FRIA_SECTIONS: FriaSection[] = [
  {
    id: "purpose",
    title: "Purpose and scope of the AI system",
    article: "Article 27(1)(a)",
    questions: [
      "What is the intended purpose of the AI system?",
      "In which processes will the deployer use the AI system?",
      "How long and how frequently will the system be used?",
    ],
  },
  {
    id: "affected-groups",
    title: "Categories of affected persons",
    article: "Article 27(1)(b)",
    questions: [
      "Which categories of natural persons and groups are likely to be affected?",
      "Are there vulnerable groups (children, elderly, disabled, minorities)?",
      "What is the estimated scale of affected persons?",
    ],
  },
  {
    id: "risks-to-rights",
    title: "Specific risks to fundamental rights",
    article: "Article 27(1)(c)",
    questions: [
      "What specific risks to fundamental rights are identified (dignity, non-discrimination, privacy, freedom of expression, right to an effective remedy)?",
      "Could the system lead to discriminatory outcomes?",
      "What is the severity and probability of harm?",
    ],
  },
  {
    id: "human-oversight",
    title: "Human oversight measures",
    article: "Article 27(1)(d)",
    questions: [
      "What human oversight processes are in place during system operation?",
      "Can a human effectively intervene or override the system?",
      "How are oversight personnel trained?",
    ],
  },
  {
    id: "mitigation",
    title: "Measures to mitigate risks",
    article: "Article 27(1)(e)",
    questions: [
      "What measures will be taken if risks materialise?",
      "Are there internal governance arrangements for oversight?",
      "What complaint and redress mechanisms exist for affected persons?",
    ],
  },
];

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
      where: { aiSystemId: systemId, type: "fria" },
      orderBy: { section: "asc" },
    });

    const sections = FRIA_SECTIONS.map((s, i) => {
      const doc = docs.find((d) => d.section === i + 1);
      return {
        ...s,
        sectionNumber: i + 1,
        status: doc?.status || "not_started",
        content: doc?.content || "",
        updatedAt: doc?.updatedAt || null,
      };
    });

    return NextResponse.json({
      systemId,
      systemName: system.name,
      riskTier: system.riskTier,
      role: system.role,
      required: system.riskTier?.toLowerCase() === "high",
      sections,
      template: FRIA_SECTIONS,
    });
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
      sectionNumber: number;
      content: string;
      status: string;
    };

    if (!b.sectionNumber || b.sectionNumber < 1 || b.sectionNumber > FRIA_SECTIONS.length) {
      return badRequest("Invalid section");
    }

    const section = FRIA_SECTIONS[b.sectionNumber - 1];
    const existing = await db.document.findFirst({
      where: { aiSystemId: systemId, type: "fria", section: b.sectionNumber },
    });

    if (existing) {
      await db.document.update({
        where: { id: existing.id },
        data: { content: b.content, status: b.status },
      });
    } else {
      await db.document.create({
        data: {
          aiSystemId: systemId,
          authorId: session.user.id,
          title: section.title,
          type: "fria",
          section: b.sectionNumber,
          content: b.content,
          status: b.status,
        },
      });
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        aiSystemId: systemId,
        action: "update_fria",
        resource: "document",
        resourceId: systemId,
        details: JSON.stringify({ section: section.title, status: b.status }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
