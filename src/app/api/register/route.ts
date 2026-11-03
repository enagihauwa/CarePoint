import argon2 from "argon2";
import { Prisma } from "@/generated/prisma/client";
import { checkBreached } from "@/lib/breachCheck";
import { prisma } from "@/lib/db";
import { readBoundedJson } from "@/lib/http";
import { guardAddress } from "@/lib/rateLimit";
import { respond } from "@/lib/respond";
import { MESSAGES } from "@/lib/validation/auth";
import { fieldMessages, RegisterSchema, SERVER_LIMITS } from "@/lib/validation/schemas";

// Order inside this endpoint: rate limit by address, read the body with a size limit, parse the
// JSON, run the schema, and only then anything else. The password is hashed with Argon2id before
// it is stored, and neither the password nor the hash is ever logged: respond() logs only the
// method, path, status and time.
export async function POST(request: Request) {
  const started = performance.now();

  const limited = guardAddress(request, started, "register");
  if (limited) return limited;

  const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
  if (!body.ok) return respond(request, started, body.status, { error: body.error });

  const parsed = RegisterSchema.safeParse(body.data);
  if (!parsed.success) {
    return respond(request, started, 400, {
      error: "Some details need fixing.",
      fields: fieldMessages(parsed.error),
    });
  }

  // A password that is valid but has appeared in a known breach is refused. This runs only for an
  // otherwise valid request, after the rate limit, so it does not make a free relay out of us.
  // FAIL OPEN: if the breach service cannot be reached, registration goes ahead without the check
  // and the log says so. A third party's outage should not stop a patient registering. This is
  // the opposite of the rate limiter, which fails closed because the limiter IS the protection.
  const breach = await checkBreached(parsed.data.password);
  if (breach.status === "breached") {
    return respond(request, started, 400, {
      error: "Some details need fixing.",
      fields: { password: [MESSAGES.passwordBreached] },
    });
  }
  if (breach.status === "unavailable") {
    console.warn("Breach check unavailable: registration allowed without it.");
  }

  // From here on only the parsed, normalised values are used, never the raw request.
  const { name, email, phone, password } = parsed.data;
  const SAME_ANSWER = { message: "Check your details are right, then continue." };

  try {
    // Hash BEFORE touching the database, so a new email and an existing one take about the same time
    // (docs/enumeration.md: sign-up must not reveal whether an email is already registered).
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    // One write, so a user never exists without a patient profile.
    await prisma.user.create({
      data: { email, passwordHash, name, patient: { create: { phone, termsAcceptedAt: new Date() } } },
    });
    return respond(request, started, 201, SAME_ANSWER);
  } catch (error) {
    // A second registration for the same email: answer exactly as for a new one. The patient who
    // owns that email is told by email in step 10, not by this response.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return respond(request, started, 201, SAME_ANSWER);
    }
    // Never report success if the write failed. The detail goes to the server log only.
    console.error("Registration write failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, {
      error: "We could not save your details. Nothing was saved. Please try again.",
    });
  }
}
