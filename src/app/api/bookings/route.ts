import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { tokenFromRequest, userForToken } from "@/lib/currentUser";
import { prisma } from "@/lib/db";
import { readBoundedJson } from "@/lib/http";
import { respond } from "@/lib/respond";
import { sameOrigin } from "@/lib/session";
import { SERVER_LIMITS } from "@/lib/validation/schemas";

// Only these three things come from the request. WHO is booking comes from the session, never from the body:
// a request that also carries a patientId, a name or a phone number has those ignored (z.object drops unknown keys).
// Rules about opening hours and past dates are NOT enforced yet: they are business rules I have not defined
// (docs/not-implemented.md).
const BookingInput = z.object({
  doctorId: z.coerce.number("Choose a doctor.").int("Choose a doctor.").positive("Choose a doctor."),
  date: z.iso.date("Enter a valid date."),
  time: z.string("Enter a valid time.").regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time."),
});

// The "code" lets the page show the right help: log in, verify, or choose another time.
const refuse = (request: Request, started: number, status: number, code: string, error: string) =>
  respond(request, started, status, { error, code });

// The order matters: the cheap and the protective checks first.
// same site -> logged in -> is a patient -> email verified -> body -> validation -> doctor -> save.
export async function POST(request: Request) {
  const started = performance.now();

  // A booking is a change of data: it must come from this site's own pages (decision 1 in docs/decisions.md).
  if (!sameOrigin(request)) return refuse(request, started, 403, "bad_origin", "Request refused.");

  try {
    const user = await userForToken(tokenFromRequest(request));
    if (!user) return refuse(request, started, 401, "login_required", "Log in or create an account to confirm your booking.");

    // Staff accounts are not patients and have no patient profile.
    const patient = user.role === "patient" ? await prisma.patient.findUnique({ where: { userId: user.id } }) : null;
    if (!patient) return refuse(request, started, 403, "not_a_patient", "Only patient accounts can book appointments.");

    // A patient who has asked to delete their account may log in (to cancel the deletion) but may not book.
    if (user.status !== "active") return refuse(request, started, 403, "deletion_pending", "Your account is scheduled for deletion. Cancel the deletion on your account page to book.");

    // Decision 4: logging in is allowed before the email is verified, but booking is not.
    if (!user.emailVerified) return refuse(request, started, 403, "verify_required", "Verify your email before booking.");

    const body = await readBoundedJson(request, SERVER_LIMITS.bodyBytes);
    if (!body.ok) return respond(request, started, body.status, { error: body.error });

    const parsed = BookingInput.safeParse(body.data);
    if (!parsed.success) {
      return respond(request, started, 400, {
        error: "Some fields are missing or invalid.",
        fields: z.flattenError(parsed.error).fieldErrors,
      });
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: parsed.data.doctorId } });
    if (!doctor) {
      return respond(request, started, 400, {
        error: "Some fields are missing or invalid.",
        fields: { doctorId: ["Choose a doctor from the list."] },
      });
    }

    try {
      const booking = await prisma.booking.create({
        data: { patientId: patient.id, doctorId: doctor.id, date: new Date(parsed.data.date), time: parsed.data.time },
      });
      return respond(request, started, 201, {
        id: booking.id,
        createdAt: booking.createdAt,
        doctor: `${doctor.name}, ${doctor.specialty}`,
        date: parsed.data.date,
        time: booking.time,
      });
    } catch (error) {
      // The database refuses a second booking for the same doctor, date and time (a unique rule). Say so plainly.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return respond(request, started, 409, {
          error: "That time is already booked for this doctor. Please choose another time.",
          code: "slot_taken",
          fields: { time: ["That time is already booked. Please choose another."] },
        });
      }
      throw error;
    }
  } catch (error) {
    // Never report success if the write failed. The detail goes to the server log only.
    console.error("Booking failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, { error: "We could not save your booking. Nothing was booked. Please try again." });
  }
}
