import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { tokenFromRequest, userForToken } from "@/lib/currentUser";
import { prisma } from "@/lib/db";
import { readBoundedJson } from "@/lib/http";
import { nairaToKobo } from "@/lib/money";
import { respond } from "@/lib/respond";
import { sameOrigin } from "@/lib/session";
import { SERVER_LIMITS } from "@/lib/validation/schemas";

// "Record a payment as paid": the front desk's job, and the one action only an admin may do. The check is HERE, on
// the server, for every request. Hiding the button on the page is not a lock: anyone can send this request by hand.
// Only these fields come from the request. WHO recorded it comes from the session, never from the body.
const PaymentInput = z.object({
  bookingId: z.coerce.number("Choose a booking.").int("Choose a booking.").positive("Choose a booking."),
  amount: z.string("Enter the amount in naira.").refine((value) => nairaToKobo(value) !== null, "Enter the amount in naira, for example 12500 or 12500.50."),
  method: z.enum(["cash", "transfer", "pos"], { error: "Choose how it was paid." }),
});

const refuse = (request: Request, started: number, status: number, code: string, error: string) =>
  respond(request, started, status, { error, code });

// Order: same site -> logged in -> admin -> body -> validation -> one locked transaction.
export async function POST(request: Request) {
  const started = performance.now();

  if (!sameOrigin(request)) return refuse(request, started, 403, "bad_origin", "Request refused.");

  try {
    const user = await userForToken(tokenFromRequest(request));
    if (!user) return refuse(request, started, 401, "login_required", "Log in to continue.");
    if (user.role !== "admin") return refuse(request, started, 403, "admin_only", "Only front-desk staff can record payments.");

    const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
    if (!body.ok) return respond(request, started, body.status, { error: body.error });

    const parsed = PaymentInput.safeParse(body.data);
    if (!parsed.success) {
      return respond(request, started, 400, { error: "Some fields are missing or invalid.", fields: z.flattenError(parsed.error).fieldErrors });
    }
    const { bookingId, method } = parsed.data;
    const amountKobo = nairaToKobo(parsed.data.amount) as number;

    // ONE transaction. The booking row is locked first, so two clicks (or two staff) recording the same booking at the
    // same moment are made to take turns: the second one sees "already paid" instead of making a second payment.
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: number }[]>`select id from "Booking" where id = ${bookingId} for update`;
      if (locked.length === 0) return { kind: "no_booking" } as const;

      const existing = await tx.payment.findMany({ where: { bookingId }, orderBy: { id: "desc" } });
      if (existing.some((payment) => payment.status === "paid")) return { kind: "already_paid" } as const;

      const now = new Date();
      const pending = existing.find((payment) => payment.status === "pending");
      const payment = pending
        ? await tx.payment.update({ where: { id: pending.id }, data: { status: "paid", method, amountKobo, paidAt: now, recordedById: user.id } })
        : await tx.payment.create({
            data: { reference: `CP-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`, bookingId, amountKobo, status: "paid", method, paidAt: now, recordedById: user.id },
          });
      // The history is append-only: a row is added for every change, and nothing in the app ever edits or deletes one.
      await tx.paymentEvent.create({
        data: { paymentId: payment.id, oldStatus: pending ? "pending" : null, newStatus: "paid", amountKobo, method, recordedById: user.id },
      });
      return { kind: "ok", payment } as const;
    });

    if (result.kind === "no_booking") return refuse(request, started, 404, "no_booking", "That booking does not exist.");
    if (result.kind === "already_paid") return refuse(request, started, 409, "already_paid", "A payment is already recorded for this booking.");

    // Ids only: no amounts, no names.
    console.log(`Payment recorded: payment=${result.payment.id} booking=${bookingId} by=${user.id}`);
    return respond(request, started, 201, {
      reference: result.payment.reference,
      amountKobo: result.payment.amountKobo,
      method: result.payment.method,
      paidAt: result.payment.paidAt,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return refuse(request, started, 409, "reference_clash", "Please try again.");
    }
    // Never claim a payment that was not saved. The detail goes to the server log only.
    console.error("Recording a payment failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, { error: "We could not record the payment. Nothing was saved. Please try again." });
  }
}
