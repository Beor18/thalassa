import { NextResponse, type NextRequest } from "next/server";

// Same name as SESSION_COOKIE in src/server/session.ts (not imported to keep the proxy light).
const SESSION_COOKIE = "thalassa_session";

/**
 * Optimistic check only: without a session cookie, game sections bounce to the landing page.
 * The real verification happens in the server DAL (requirePlayerId).
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/ciudad/:path*",
    "/isla/:path*",
    "/mundo/:path*",
    "/investigacion/:path*",
    "/militar/:path*",
    "/informes/:path*",
    "/ranking/:path*",
    "/tesoro/:path*",
    "/invitar/:path*",
  ],
};
