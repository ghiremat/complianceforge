import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100).optional(),
  organizationName: z
    .string()
    .trim()
    .min(1, "Organization name is required")
    .max(100),
});

function normalizeRegisterBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || body === null) return body;
  const b = body as Record<string, unknown>;
  if (b.organizationName === undefined && typeof b.orgName === "string") {
    return { ...b, organizationName: b.orgName };
  }
  if (typeof b.organizationName === "string") {
    return { ...b, organizationName: b.organizationName.trim() };
  }
  if (
    (b.organizationName === undefined || b.organizationName === "") &&
    typeof b.email === "string"
  ) {
    const local = b.email.trim().split("@")[0];
    if (local) {
      return { ...b, organizationName: local };
    }
  }
  return body;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(normalizeRegisterBody(body));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, name, organizationName } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const slug = (organizationName || name?.trim() || normalizedEmail.split("@")[0])
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48);

    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    const org = await db.organization.create({
      data: {
        name: organizationName || `${name?.trim() || normalizedEmail.split("@")[0]}'s Org`,
        slug: uniqueSlug,
        plan: "free",
        maxSystems: 3,
      },
    });

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name !== undefined ? name.trim() || null : null,
        hashedPassword,
        role: "admin",
        organizationId: org.id,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, organizationId: org.id },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
