import { auth } from "@/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isSystemsListAnonymousGet =
    req.method === "GET" &&
    (nextUrl.pathname === "/api/systems" || nextUrl.pathname === "/api/systems/");

  const isAuthPage =
    nextUrl.pathname.startsWith("/sign-in") ||
    nextUrl.pathname.startsWith("/sign-up");
  const isPublicPage =
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/trust/") ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/health") ||
    nextUrl.pathname.startsWith("/api/passport") ||
    nextUrl.pathname.startsWith("/api/github/webhook") ||
    nextUrl.pathname.startsWith("/api/register") ||
    nextUrl.pathname.startsWith("/api/v1/");

  if (isPublicPage || isSystemsListAnonymousGet) return;

  if (isAuthPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/dashboard", nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return Response.redirect(
      new URL(`/sign-in?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
