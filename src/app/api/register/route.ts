import { prisma } from "@/lib/db";
import { readBoundedJson } from "@/lib/http";
import { respond } from "@/lib/respond";
import { fieldMessages, RegisterSchema, SERVER_LIMITS } from "@/lib/validation/schemas";

// Task 4: this endpoint now validates everything on the server, in this order: size, JSON,
// then the schema, and only then anything else. The password is checked but NOT stored yet
// (hashing and the users table come later) and is never logged: respond() logs only the
// method, path, status and time.
export async function POST(request: Request) {
  const started = performance.now();

  const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
  if (!body.ok) return respond(request, started, body.status, { error: body.error });

  const parsed = RegisterSchema.safeParse(body.data);
  if (!parsed.success) {
    return respond(request, started, 400, {
      error: "Some details need fixing.",
      fields: fieldMessages(parsed.error),
    });
  }

  // From here on only the parsed, normalised values are used, never the raw request.
  const { name, email, phone } = parsed.data;

  try {
    const patient = await prisma.patient.create({
      data: { name, email, phone, termsAcceptedAt: new Date() },
    });
    return respond(request, started, 201, { id: patient.id, createdAt: patient.createdAt });
  } catch (error) {
    // Never report success if the write failed. The detail goes to the server log only.
    console.error("Patient write failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, {
      error: "We could not save your details. Nothing was saved. Please try again.",
    });
  }
}
