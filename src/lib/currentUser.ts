import { cookies } from "next/headers";
import { prisma } from "./db";
import { hashToken } from "./session";
import { SESSION_COOKIE } from "./sessionConfig";

// The real session check. proxy.ts only asks "is there a cookie at all?" (quick, no database). THIS asks the
// database whether the cookie is a live session. Every page and route that shows or changes someone's data
// must call this itself: the proxy is a convenience, not the lock (docs/decisions.md, "proxy and helper").

// The token is 43 characters (src/lib/session.ts). Anything else is junk, so skip the database for it.
const TOKEN_LENGTH = 43;

// lastSeenAt is only refreshed when it is older than this, so one busy page does not write on every request.
const TOUCH_AFTER_MS = 60_000;

export type CurrentUser = {
  sessionId: number;
  id: number;
  name: string;
  email: string;
  role: "patient" | "admin";
  emailVerified: boolean;
};

export async function userForToken(token: string | undefined): Promise<CurrentUser | null> {
  if (!token || token.length !== TOKEN_LENGTH) return null;

  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  // Unknown, logged out (row deleted), revoked, or past its end time: all the same answer, "not logged in".
  if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= Date.now()) return null;

  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
    // A failed bookkeeping write must not log anyone out.
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }

  const { user } = session;
  return { sessionId: session.id, id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerifiedAt !== null };
}

// For pages and server components.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  return userForToken(store.get(SESSION_COOKIE)?.value);
}

// For route handlers, which get the raw Cookie header.
export function tokenFromRequest(request: Request): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return undefined;
}
