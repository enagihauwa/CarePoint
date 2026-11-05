import argon2 from "argon2";
import { checkBreached } from "@/lib/breachCheck";
import { prisma } from "@/lib/db";
import { readBoundedJson } from "@/lib/http";
import { guardAddress, guardEmail } from "@/lib/rateLimit";
import { respond } from "@/lib/respond";
import { MESSAGES } from "@/lib/validation/auth";
import { fieldMessages, GENERIC_BAD_REQUEST, ResetConfirmSchema, SERVER_LIMITS } from "@/lib/validation/schemas";
import { codeMatches, MAX_WRONG_TRIES } from "@/lib/verification";

// ONE answer for every way a code can fail: wrong, expired, used, replaced, or no such account. A different
// answer would tell a stranger which emails have accounts.
const CODE_FAILED = "That code is not right, or it has expired. Check it, or ask for a new one.";

// Step two of a reset: the emailed code plus the new password.
// Order: limit by address, read the body with a size limit, limit by email, schema, breach check, then the code.
// The password is checked BEFORE the code is spent, so a password that is too weak does not use up a try.
export async function POST(request: Request) {
  const started = performance.now();

  const limitedByAddress = guardAddress(request, started, "resetConfirm");
  if (limitedByAddress) return limitedByAddress;

  const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
  if (!body.ok) return respond(request, started, body.status, { error: body.error });

  const rawEmail = typeof body.data === "object" && body.data !== null ? (body.data as Record<string, unknown>).email : undefined;
  const limitedByEmail = guardEmail(request, started, "resetConfirm", rawEmail);
  if (limitedByEmail) return limitedByEmail;

  const parsed = ResetConfirmSchema.safeParse(body.data);
  if (!parsed.success) {
    // A bad PASSWORD can be explained, because the person typed it and needs to fix it. Anything wrong with the
    // email or the code gets the one generic answer.
    const fields = fieldMessages(parsed.error);
    if (Object.keys(fields).length === 1 && fields.password) {
      return respond(request, started, 400, { error: "Some details need fixing.", fields: { password: fields.password } });
    }
    return respond(request, started, 400, { error: GENERIC_BAD_REQUEST });
  }
  const { email, code, password } = parsed.data;

  // A password in a known breach is refused, exactly as at registration. FAIL OPEN if the service is down.
  const breach = await checkBreached(password);
  if (breach.status === "breached") {
    return respond(request, started, 400, { error: "Some details need fixing.", fields: { password: [MESSAGES.passwordBreached] } });
  }
  if (breach.status === "unavailable") console.warn("Breach check unavailable: password reset allowed without it.");

  try {
    // Hash BEFORE looking anything up, so an email with no account takes about as long as one with an account.
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return respond(request, started, 400, { error: CODE_FAILED });

    // Only the newest reset code that is unused and not expired. A verification code never works here.
    const row = await prisma.emailVerification.findFirst({
      where: { userId: user.id, purpose: "reset", usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { id: "desc" },
    });
    if (!row) return respond(request, started, 400, { error: CODE_FAILED });

    // Count this try BEFORE comparing, and only while tries remain, in one atomic step (as in /api/verify).
    const counted = await prisma.emailVerification.updateMany({
      where: { id: row.id, usedAt: null, attempts: { lt: MAX_WRONG_TRIES } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) return respond(request, started, 400, { error: CODE_FAILED });

    if (!codeMatches(user.id, code, row.codeHash)) {
      // A wrong code. If that was the last try, the code dies.
      if (row.attempts + 1 >= MAX_WRONG_TRIES) {
        await prisma.emailVerification.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
      }
      return respond(request, started, 400, { error: CODE_FAILED });
    }

    // Right code. THREE things happen together, or none of them: the code is spent, the new password is stored,
    // and EVERY session of this user is deleted. If the person's cookie was stolen, it stops working now, which
    // is the reason a reset must end all sessions. "usedAt: null" means a code can only be spent once.
    const [spent, , sessions] = await prisma.$transaction([
      prisma.emailVerification.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);
    if (spent.count !== 1) return respond(request, started, 400, { error: CODE_FAILED });

    // Counts only: no email, no code, no hash.
    console.log(`Password reset: user=${user.id} sessions_deleted=${sessions.count}`);
    return respond(request, started, 200, { message: "Your password was changed. You have been logged out everywhere. Log in with your new password." });
  } catch (error) {
    // Never claim a change that did not happen. The detail goes to the server log only.
    console.error("Password reset failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, { error: "We could not change your password. Please try again." });
  }
}
