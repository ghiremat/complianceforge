import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { withRateLimit } from "@/lib/api-middleware";
import {
  badRequest,
  conflict,
  rateLimited,
  serverError,
  validationError,
} from "@/lib/api-errors";
import { logger } from "@/lib/logger";
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
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { limited } = withRateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (limited) {
    return rateLimited("Too many registration attempts. Please try again later.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  try {
    const parsed = registerSchema.safeParse(normalizeRegisterBody(body));
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { email, password, name, organizationName } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return conflict("An account with this email already exists");
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
    logger.error("Registration error", { err: String(err) });
    return serverError();
  }
}
