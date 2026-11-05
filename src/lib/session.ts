import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";
import { ADMIN_SESSION_SECONDS, PATIENT_SESSION_SECONDS, SESSION_COOKIE, SESSION_SAME_SITE } from "./sessionConfig";

// A session token is 32 random bytes from the operating system's secure source, written in a form that is
// safe inside a cookie. Only its SHA-256 hash is stored, so a copy of the database cannot be used to log in.
// A fast hash is fine here, unlike for passwords: the token is already 256 bits of randomness, so there is
// nothing to guess.
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionSeconds(role: "patient" | "admin"): number {
  return role === "admin" ? ADMIN_SESSION_SECONDS : PATIENT_SESSION_SECONDS;
}

// Every login makes a NEW token, so a token seen before a login is never valid after it.
export async function createSession(userId: number, role: "patient" | "admin") {
  const token = newToken();
  const seconds = sessionSeconds(role);
  const tokenHash = hashToken(token);
  await prisma.session.create({ data: { userId, tokenHash, expiresAt: new Date(Date.now() + seconds * 1000) } });
  // The log line shows the first 8 characters of the HASH only: enough to tell two sessions apart, never
  // enough to use one, and never the token itself.
  console.log(`Session created: user=${userId} hash_prefix=${tokenHash.slice(0, 8)} lifetime_seconds=${seconds}`);
  return { token, seconds };
}

// Secure means "send this cookie only over HTTPS". It is on everywhere except localhost, where the
// development server has no HTTPS. (Behind a proxy the address may be a different host name: this reads the
// address the request was made to, taken from the Host header: request.url keeps saying "localhost" in this
// framework whatever host the browser used, and trusting it left the cookie without Secure on a real host.
// A client that lies about the Host header only changes the flags on its own cookie.)
export function isLocalhost(request: Request): boolean {
  const header = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const host = header.split(",")[0].trim().replace(/:\d+$/, "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

// Logging out: the same cookie again with no value and no life left, so the browser throws it away.
// The flags must match the ones it was set with, or some browsers keep the old cookie.
export function clearedSessionCookie(secure: boolean): string {
  return sessionCookie("", 0, secure);
}

// A request that changes data must come from this site's own pages. SameSite=Lax already stops the browser
// sending the cookie on cross-site POSTs; this is the second lock (decision 1). A request with no Origin
// header (a script, not a browser) is allowed: it has no browser session to be tricked into using.
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

// HttpOnly: JavaScript on the page cannot read the cookie, which limits what an injected script can steal.
// Path=/: sent for the whole site. Max-Age: the browser throws it away when the session would have expired.
export function sessionCookie(token: string, seconds: number, secure: boolean): string {
  return [`${SESSION_COOKIE}=${token}`, `Max-Age=${seconds}`, "Path=/", "HttpOnly", `SameSite=${SESSION_SAME_SITE}`, ...(secure ? ["Secure"] : [])].join("; ");
}
