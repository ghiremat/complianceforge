import { auth } from "@/auth";
import { db } from "@/server/db";

export type AuthSession = {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
};

/**
 * Get the authenticated session or throw. Use in server components and API routes
 * that require a logged-in user with an active organization.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    organizationId: session.user.organizationId,
    organizationName: session.user.organizationName,
  };
}

/**
 * Verify a user belongs to an organization and return their membership context.
 */
export async function requireOrgMember(organizationId: string) {
  const session = await requireAuth();
  if (session.organizationId !== organizationId) {
    throw new Error("Forbidden: not a member of this organization");
  }
  return session;
}

/**
 * List organizations a user belongs to (for future multi-org switching).
 * Currently a user belongs to exactly one org.
 */
export async function getUserOrganizations(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, plan: true },
      },
    },
  });
  if (!user) return [];
  return [user.organization];
}
