import { readBoundedJson } from "@/lib/http";
import { respond } from "@/lib/respond";
import { GENERIC_BAD_REQUEST, LoginSchema, SERVER_LIMITS } from "@/lib/validation/schemas";

// Login is validated on the server already, but there are no accounts to log in to yet
// (the users table and sessions come later), so a valid request gets an honest "not available".
// A bad request gets ONE generic message, so it never says which half of a credential was wrong.
export async function POST(request: Request) {
  const started = performance.now();

  const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
  if (!body.ok) return respond(request, started, body.status, { error: body.error });

  if (!LoginSchema.safeParse(body.data).success) {
    return respond(request, started, 400, { error: GENERIC_BAD_REQUEST });
  }

  return respond(request, started, 501, { error: "Logging in is not available yet." });
}
