import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/sessionConfig";

// The quick check, before the page is rendered: is there a session cookie at all? No database here.
// A person with no cookie is sent to the login page instead of seeing an empty page flash.
// This does NOT prove the cookie is a live session (anyone can send a made-up cookie). The page itself
// calls getCurrentUser() in src/lib/currentUser.ts, which asks the database. See docs/decisions.md.
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  // Change the path on a copy of the address the browser used, so the host stays the one they typed.
  const login = request.nextUrl.clone();
  login.pathname = "/auth";
  login.search = request.nextUrl.pathname === "/admin" ? "?mode=login&next=/admin" : "?mode=login";
  return NextResponse.redirect(login);
}

// Only the pages that need a login. Add each protected path here when it is built.
export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
