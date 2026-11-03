import { readBoundedJson } from "@/lib/http";
import { guardAddress, guardEmail } from "@/lib/rateLimit";
import { respond } from "@/lib/respond";
import { GENERIC_BAD_REQUEST, ResetSchema, SERVER_LIMITS } from "@/lib/validation/schemas";

// Reset is validated and rate limited already, but no email is sent yet. A bad request gets ONE
// generic message. A valid one gets an honest "not available", and the answer never depends on
// whether the email belongs to an account.
// Order: limit by address, read the body, limit by email, then the schema.
export async function POST(request: Request) {
  const started = performance.now();

  const limitedByAddress = guardAddress(request, started, "reset");
  if (limitedByAddress) return limitedByAddress;

  const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
  if (!body.ok) return respond(request, started, body.status, { error: body.error });

  const email = typeof body.data === "object" && body.data !== null ? (body.data as Record<string, unknown>).email : undefined;
  const limitedByEmail = guardEmail(request, started, "reset", email);
  if (limitedByEmail) return limitedByEmail;

  if (!ResetSchema.safeParse(body.data).success) {
    return respond(request, started, 400, { error: GENERIC_BAD_REQUEST });
  }

  return respond(request, started, 501, { error: "Password reset is not available yet." });
}
