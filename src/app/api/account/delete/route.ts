import argon2 from "argon2";
import { z } from "zod";
import { tokenFromRequest, userForToken } from "@/lib/currentUser";
import { prisma } from "@/lib/db";
import { GRACE_DAYS, purgeDate } from "@/lib/deletionConfig";
import { readBoundedJson } from "@/lib/http";
import { guardEmail } from "@/lib/rateLimit";
import { respond } from "@/lib/respond";
import { clearedSessionCookie, isLocalhost, sameOrigin } from "@/lib/session";
import { SERVER_LIMITS } from "@/lib/validation/schemas";

const DeleteInput = z.object({ password: z.string().min(1).max(64) });

const refuse = (request: Request, started: number, status: number, code: string, error: string) =>
  respond(request, started, status, { error, code });

// A patient asks to delete their own account. Nothing is erased now: the account becomes "pending_deletion" and the
// nightly purge anonymises it after GRACE_DAYS. Until then the patient can log in and cancel.
// The CURRENT PASSWORD is asked for, so that a phone left unlocked, or a stolen session, cannot start a deletion.
// Order: same site -> logged in -> a patient -> not already pending -> limit -> body -> password -> one transaction.
export async function POST(request: Request) {
  const started = performance.now();

  if (!sameOrigin(request)) return refuse(request, started, 403, "bad_origin", "Request refused.");

  try {
    const user = await userForToken(tokenFromRequest(request));
    if (!user) return refuse(request, started, 401, "login_required", "Log in to continue.");
    // Staff accounts are not deleted this way.
    if (user.role !== "patient") return refuse(request, started, 403, "not_a_patient", "Only patient accounts can be deleted here.");
    if (user.status !== "active") return refuse(request, started, 409, "already_pending", "Your account is already scheduled for deletion.");

    // Wrong passwords share the login limit for this email (5 per 15 minutes): someone with a stolen session must
    // not be able to guess the password here without limit.
    const limited = guardEmail(request, started, "login", user.email);
    if (limited) return limited;

    const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
    if (!body.ok) return respond(request, started, body.status, { error: body.error });
    const parsed = DeleteInput.safeParse(body.data);
    if (!parsed.success) return refuse(request, started, 400, "bad_request", "Enter your password to confirm.");

    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    let passwordOk = false;
    try { passwordOk = !!row && (await argon2.verify(row.passwordHash, parsed.data.password)); } catch { passwordOk = false; }
    if (!passwordOk) return refuse(request, started, 401, "wrong_password", "That password is not right. Nothing was changed.");

    // Marked pending and every session ended, together or not at all. "status: active" in the condition means two
    // simultaneous requests cannot both start the clock.
    const now = new Date();
    const [marked, sessions] = await prisma.$transaction([
      prisma.user.updateMany({ where: { id: user.id, status: "active" }, data: { status: "pending_deletion", deletionRequestedAt: now } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);
    if (marked.count !== 1) return refuse(request, started, 409, "already_pending", "Your account is already scheduled for deletion.");

    console.log(`Deletion requested: user=${user.id} sessions_deleted=${sessions.count}`);
    // The session this request came from is gone, so the browser's cookie is cleared too.
    return respond(
      request,
      started,
      200,
      { purgeAfter: purgeDate(now).toISOString(), graceDays: GRACE_DAYS },
      { "Set-Cookie": clearedSessionCookie(!isLocalhost(request)) },
    );
  } catch (error) {
    // Never claim a deletion that was not saved. The detail goes to the server log only.
    console.error("Deletion request failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, { error: "We could not schedule the deletion. Nothing was changed. Please try again." });
  }
}
