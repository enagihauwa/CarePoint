import { prisma } from "@/lib/db";
import { readBoundedJson } from "@/lib/http";
import { guardAddress, guardEmail } from "@/lib/rateLimit";
import { respond } from "@/lib/respond";
import { GENERIC_BAD_REQUEST, SERVER_LIMITS, VerifySchema } from "@/lib/validation/schemas";
import { codeMatches, MAX_WRONG_TRIES } from "@/lib/verification";

// ONE answer for every way a code can fail: wrong, expired, used, no such account, already verified.
// A different answer would tell a stranger which emails are registered (docs/enumeration.md).
const CODE_FAILED = "That code is not right, or it has expired. Check it, or ask for a new one.";

// Order: limit by address, read the body with a size limit, limit by email, then the schema.
export async function POST(request: Request) {
  const started = performance.now();

  const limitedByAddress = guardAddress(request, started, "verify");
  if (limitedByAddress) return limitedByAddress;

  const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
  if (!body.ok) return respond(request, started, body.status, { error: body.error });

  const rawEmail = typeof body.data === "object" && body.data !== null ? (body.data as Record<string, unknown>).email : undefined;
  const limitedByEmail = guardEmail(request, started, "verify", rawEmail);
  if (limitedByEmail) return limitedByEmail;

  const parsed = VerifySchema.safeParse(body.data);
  if (!parsed.success) return respond(request, started, 400, { error: GENERIC_BAD_REQUEST });
  const { email, code } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) return respond(request, started, 400, { error: CODE_FAILED });

    // Only the newest code that is unused and not expired can work.
    const row = await prisma.emailVerification.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { id: "desc" },
    });
    if (!row) return respond(request, started, 400, { error: CODE_FAILED });

    // Count this try BEFORE comparing, and only while tries remain, in one atomic step. Two requests racing
    // cannot both slip past the cap: at most MAX_WRONG_TRIES comparisons are ever made against one code.
    const counted = await prisma.emailVerification.updateMany({
      where: { id: row.id, usedAt: null, attempts: { lt: MAX_WRONG_TRIES } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) return respond(request, started, 400, { error: CODE_FAILED });

    if (codeMatches(user.id, code, row.codeHash)) {
      // Used and verified together, or neither. "usedAt: null" means a code can only be spent once.
      const [spent] = await prisma.$transaction([
        prisma.emailVerification.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } }),
        prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }),
      ]);
      if (spent.count === 1) return respond(request, started, 200, { message: "Your email is verified." });
      return respond(request, started, 400, { error: CODE_FAILED });
    }

    // A wrong code. If that was the last try, the code dies.
    if (row.attempts + 1 >= MAX_WRONG_TRIES) {
      await prisma.emailVerification.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    }
    return respond(request, started, 400, { error: CODE_FAILED });
  } catch (error) {
    // Never claim success when something failed. The detail goes to the server log only.
    console.error("Verification failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, { error: "We could not check the code. Please try again." });
  }
}
