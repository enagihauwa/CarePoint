import { prisma } from "@/lib/db";
import { tokenFromRequest } from "@/lib/currentUser";
import { respond } from "@/lib/respond";
import { clearedSessionCookie, hashToken, isLocalhost, sameOrigin } from "@/lib/session";

// Logging out deletes the session row. Deleting the cookie in the browser is not enough: a copy of the
// token (a stolen cookie) would still work until it expired. With the row gone, every copy stops working.
export async function POST(request: Request) {
  const started = performance.now();

  if (!sameOrigin(request)) return respond(request, started, 403, { error: "Request refused." });

  try {
    const token = tokenFromRequest(request);
    // deleteMany, not delete: logging out twice, or with a cookie that is already dead, is not an error.
    const result = token ? await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }) : { count: 0 };
    console.log(`Session ended: rows_deleted=${result.count}${token ? ` hash_prefix=${hashToken(token).slice(0, 8)}` : ""}`);
    return respond(request, started, 200, { loggedOut: true }, { "Set-Cookie": clearedSessionCookie(!isLocalhost(request)) });
  } catch (error) {
    // The row may still exist. Say so, and do not clear the cookie: the person is still logged in.
    console.error("Logout failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, { error: "We could not log you out. You are still logged in. Please try again." });
  }
}
