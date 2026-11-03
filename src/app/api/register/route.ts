import { prisma } from "@/lib/db";
import { respond } from "@/lib/respond";

// Task 3 deliberately has NO server-side validation. The browser form enforces the rules,
// and this endpoint saves whatever it is sent, so that docs/client-side-is-not-security.md
// can show what a direct request gets through. Task 4 makes the server the source of truth.
// The password is never read or stored here: hashing comes in Task 4.
const text = (value: unknown) => (typeof value === "string" ? value : "");

export async function POST(request: Request) {
  const started = performance.now();

  let body: Record<string, unknown> = {};
  try {
    const json: unknown = await request.json();
    if (json && typeof json === "object") body = json as Record<string, unknown>;
  } catch {
    // Not JSON: fall through and save empty values, like any other unchecked request.
  }

  try {
    const patient = await prisma.patient.create({
      data: {
        name: text(body.name),
        email: text(body.email),
        phone: text(body.phone),
        termsAcceptedAt: body.termsAccepted === true ? new Date() : null,
      },
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
