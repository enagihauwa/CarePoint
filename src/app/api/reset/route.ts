import { readBoundedJson } from "@/lib/http";
import { respond } from "@/lib/respond";
import { GENERIC_BAD_REQUEST, ResetSchema, SERVER_LIMITS } from "@/lib/validation/schemas";

// Reset is validated on the server already, but no email is sent yet. A bad request gets ONE
// generic message. A valid one gets an honest "not available", and the answer never depends on
// whether the email belongs to an account.
export async function POST(request: Request) {
  const started = performance.now();

  const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
  if (!body.ok) return respond(request, started, body.status, { error: body.error });

  if (!ResetSchema.safeParse(body.data).success) {
    return respond(request, started, 400, { error: GENERIC_BAD_REQUEST });
  }

  return respond(request, started, 501, { error: "Password reset is not available yet." });
}
