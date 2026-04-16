import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("demo123", 12);

  const org = await prisma.organization.upsert({
    where: { id: "demo-org-001" },
    update: { name: "Acme AI Corp", slug: "acme-ai", plan: "pro", maxSystems: 25 },
    create: {
      id: "demo-org-001",
      name: "Acme AI Corp",
      slug: "acme-ai",
      plan: "pro",
      maxSystems: 25,
    },
  });

  await prisma.user.upsert({
    where: { email: "demo@complianceforge.ai" },
    update: { hashedPassword: password },
    create: {
      email: "demo@complianceforge.ai",
      name: "Demo User",
      hashedPassword: password,
      role: "admin",
      organizationId: org.id,
    },
  });

  const systems = [
    {
      id: "sys-fraud-001",
      name: "Fraud Detection Model",
      description:
        "ML model for real-time transaction fraud detection in payment processing",
      sector: "Financial Services",
      useCase: "Credit scoring and fraud prevention",
      riskTier: "high",
      complianceScore: 35,
      complianceStatus: "in_progress",
      deploymentRegion: "EU",
    },
    {
      id: "sys-hiring-002",
      name: "Resume Screening AI",
      description: "NLP-based resume screening and candidate ranking for recruitment",
      sector: "Human Resources",
      useCase: "Automated hiring decisions",
      riskTier: "high",
      complianceScore: 15,
      complianceStatus: "in_progress",
      deploymentRegion: "EU",
    },
    {
      id: "sys-chatbot-003",
      name: "Customer Support Chatbot",
      description: "LLM-powered chatbot for customer service inquiries",
      sector: "Technology",
      useCase: "Customer interaction and support",
      riskTier: "limited",
      complianceScore: 60,
      complianceStatus: "in_progress",
      deploymentRegion: "EU",
    },
  ];

  for (const sys of systems) {
    await prisma.aiSystem.upsert({
      where: { id: sys.id },
      update: {},
      create: {
        ...sys,
        organizationId: org.id,
      },
    });
  }

  const deadlines = [
    {
      title: "EU AI Act — Full enforcement",
      description: "All obligations under the EU AI Act take effect",
      dueDate: new Date("2026-08-02"),
      priority: "high",
      category: "regulatory",
    },
    {
      title: "Register high-risk AI systems",
      description: "All high-risk systems must be registered in the EU database",
      dueDate: new Date("2026-08-02"),
      priority: "high",
      category: "registration",
    },
    {
      title: "Complete Annex IV documentation",
      description: "Technical documentation per Annex IV for all high-risk systems",
      dueDate: new Date("2026-07-01"),
      priority: "high",
      category: "documentation",
    },
    {
      title: "Implement post-market monitoring",
      description: "Establish post-market monitoring system per Article 72",
      dueDate: new Date("2026-06-01"),
      priority: "medium",
      category: "monitoring",
    },
    {
      title: "Conduct conformity assessment",
      description: "Self-assessment or notified body assessment per Article 43",
      dueDate: new Date("2026-07-15"),
      priority: "medium",
      category: "assessment",
    },
  ];

  for (const d of deadlines) {
    const existing = await prisma.complianceDeadline.findFirst({
      where: { title: d.title, organizationId: org.id },
    });
    if (!existing) {
      await prisma.complianceDeadline.create({
        data: { ...d, organizationId: org.id },
      });
    }
  }

  const apiKeyRaw = "cf_demo_key_12345";
  const keyHash = createHash("sha256").update(apiKeyRaw, "utf8").digest("hex");
  const keyPrefix = apiKeyRaw.slice(0, 12);

  await prisma.apiKey.upsert({
    where: { keyHash },
    update: { keyPrefix },
    create: {
      name: "Demo API Key",
      keyHash,
      keyPrefix,
      organizationId: org.id,
    },
  });

  console.log("Seed complete:");
  console.log("  Demo login: demo@complianceforge.ai / demo123");
  console.log(`  Demo API key: ${apiKeyRaw}`);
  console.log(`  Organization: ${org.name} (slug: ${org.slug})`);
  console.log(`  AI Systems: ${systems.length} created`);
  console.log(`  Deadlines: ${deadlines.length} created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
