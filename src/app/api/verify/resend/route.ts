import { prisma } from "@/lib/db";
import { readBoundedJson } from "@/lib/http";
import { enqueueVerification } from "@/lib/queue";
import { guardAddress, guardEmail } from "@/lib/rateLimit";
import { respond } from "@/lib/respond";
import { GENERIC_BAD_REQUEST, ResendSchema, SERVER_LIMITS } from "@/lib/validation/schemas";

// The same answer whether or not the email has an account, so this cannot be used to find out who is registered.
const ACCEPTED = { message: "If that email can be verified, we have sent a new code. Check your Spam folder too." };

export async function POST(request: Request) {
  const started = performance.now();

  const limitedByAddress = guardAddress(request, started, "resend");
  if (limitedByAddress) return limitedByAddress;

  const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
  if (!body.ok) return respond(request, started, body.status, { error: body.error });

  const rawEmail = typeof body.data === "object" && body.data !== null ? (body.data as Record<string, unknown>).email : undefined;
  const limitedByEmail = guardEmail(request, started, "resend", rawEmail);
  if (limitedByEmail) return limitedByEmail;

  const parsed = ResendSchema.safeParse(body.data);
  if (!parsed.success) return respond(request, started, 400, { error: GENERIC_BAD_REQUEST });

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, emailVerifiedAt: true } });
    // The job makes the new code and retires the older ones, so only the newest works.
    if (user && !user.emailVerifiedAt) await enqueueVerification({ userId: user.id, kind: "verify" });
    return respond(request, started, 202, ACCEPTED);
  } catch (error) {
    console.error("Resend failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, { error: "We could not send a new code. Please try again." });
  }
}
