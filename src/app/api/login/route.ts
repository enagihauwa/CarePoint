import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { readBoundedJson } from "@/lib/http";
import { guardAddress, guardEmail } from "@/lib/rateLimit";
import { respond } from "@/lib/respond";
import { createSession, isLocalhost, sessionCookie } from "@/lib/session";
import { GENERIC_BAD_REQUEST, LoginSchema, SERVER_LIMITS } from "@/lib/validation/schemas";

// ONE message for a wrong password and for an email with no account. Two different messages would tell a
// stranger which emails belong to patients of this clinic.
const WRONG_LOGIN = "Incorrect email or password.";

// A real Argon2id hash of nothing useful. When the email has no account, the submitted password is checked
// against this instead, so an unknown email costs the same time as a wrong password (about 77 ms, docs/hashing.md).
// Without it, an attacker could tell the two cases apart by timing alone. It is made once, when the server starts.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= argon2.hash("not a real password, only for timing", { type: argon2.argon2id }));
void getDummyHash();

async function passwordMatches(storedHash: string | undefined, password: string): Promise<boolean> {
  try {
    return await argon2.verify(storedHash ?? (await getDummyHash()), password);
  } catch {
    // A stored value that is not a valid hash (the placeholder account's "!") throws at once. Burn the same time
    // as a real check, so that case cannot be told apart by timing either.
    try { await argon2.verify(await getDummyHash(), password); } catch { /* ignore */ }
    return false;
  }
}

// Order: limit by address, read the body with a size limit, limit by email, then the schema.
// Every attempt counts toward the email limit, successful or not (docs/rate-limiting.md).
export async function POST(request: Request) {
  const started = performance.now();

  const limitedByAddress = guardAddress(request, started, "login");
  if (limitedByAddress) return limitedByAddress;

  const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
  if (!body.ok) return respond(request, started, body.status, { error: body.error });

  const rawEmail = typeof body.data === "object" && body.data !== null ? (body.data as Record<string, unknown>).email : undefined;
  const limitedByEmail = guardEmail(request, started, "login", rawEmail);
  if (limitedByEmail) return limitedByEmail;

  const parsed = LoginSchema.safeParse(body.data);
  if (!parsed.success) return respond(request, started, 400, { error: GENERIC_BAD_REQUEST });
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await passwordMatches(user?.passwordHash, password);
    if (!user || !ok) return respond(request, started, 401, { error: WRONG_LOGIN });

    // An unverified account may log in (decision 4 in docs/decisions.md): it can neither book nor see anything
    // yet. The page is told, so it can say "verify your email".
    const { token, seconds } = await createSession(user.id, user.role);
    return respond(
      request,
      started,
      200,
      { name: user.name, role: user.role, emailVerified: user.emailVerifiedAt !== null },
      { "Set-Cookie": sessionCookie(token, seconds, !isLocalhost(request)) },
    );
  } catch (error) {
    // Never claim a login that did not happen. The detail goes to the server log only.
    console.error("Login failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, { error: "We could not log you in. Please try again." });
  }
}
