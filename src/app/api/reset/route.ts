import { prisma } from "@/lib/db";
import { readBoundedJson } from "@/lib/http";
import { enqueueVerification } from "@/lib/queue";
import { guardAddress, guardEmail } from "@/lib/rateLimit";
import { respond } from "@/lib/respond";
import { GENERIC_BAD_REQUEST, ResetSchema, SERVER_LIMITS } from "@/lib/validation/schemas";

// The same answer whether or not the email has an account, so this cannot be used to find out who is a patient.
const ACCEPTED = { message: "If that email has an account, we have sent a 6-digit code. Check your Spam folder too." };

// Step one of a reset: ask for a code. The code is made and emailed by the background worker, never during this
// request, so the answer does not wait for Gmail and does not depend on whether the account exists.
// Order: limit by address, read the body, limit by email, then the schema.
export async function POST(request: Request) {
  const started = performance.now();

  const limitedByAddress = guardAddress(request, started, "reset");
  if (limitedByAddress) return limitedByAddress;

  const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
  if (!body.ok) return respond(request, started, body.status, { error: body.error });

  const rawEmail = typeof body.data === "object" && body.data !== null ? (body.data as Record<string, unknown>).email : undefined;
  const limitedByEmail = guardEmail(request, started, "reset", rawEmail);
  if (limitedByEmail) return limitedByEmail;

  const parsed = ResetSchema.safeParse(body.data);
  if (!parsed.success) return respond(request, started, 400, { error: GENERIC_BAD_REQUEST });

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (user) await enqueueVerification({ userId: user.id, kind: "reset" });
  } catch (error) {
    // The answer stays the same: a different answer when something fails would tell a stranger which emails
    // have accounts. The detail goes to the server log only.
    console.error("Could not queue the reset email:", error instanceof Error ? error.message : error);
  }
  return respond(request, started, 202, ACCEPTED);
}
