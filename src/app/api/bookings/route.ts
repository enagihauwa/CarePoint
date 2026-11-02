import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

// Task 2 only checks that every field is filled in. The real rules (phone format,
// allowed dates, opening hours) are chosen and derived in Task 3.
const filled = z.string().trim().min(1, "This field is required.");
const BookingInput = z.object({
  name: filled,
  phone: filled,
  doctorId: z.coerce.number("Choose a doctor.").int("Choose a doctor.").positive("Choose a doctor."),
  date: z.iso.date("Enter a valid date."),
  time: filled,
});

// One log line per request: method, path, status and time taken.
function respond(request: Request, started: number, status: number, body: unknown) {
  const ms = Math.round(performance.now() - started);
  console.log(`${request.method} ${new URL(request.url).pathname} ${status} ${ms}ms`);
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const started = performance.now();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return respond(request, started, 400, { error: "The request was not valid JSON." });
  }

  const parsed = BookingInput.safeParse(json);
  if (!parsed.success) {
    return respond(request, started, 400, {
      error: "Some fields are missing or invalid.",
      fields: z.flattenError(parsed.error).fieldErrors,
    });
  }

  try {
    const doctor = await prisma.doctor.findUnique({ where: { id: parsed.data.doctorId } });
    if (!doctor) {
      return respond(request, started, 400, {
        error: "Some fields are missing or invalid.",
        fields: { doctorId: ["Choose a doctor from the list."] },
      });
    }
    const booking = await prisma.booking.create({
      data: { ...parsed.data, date: new Date(parsed.data.date) },
    });
    return respond(request, started, 201, {
      id: booking.id,
      createdAt: booking.createdAt,
      doctor: `${doctor.name}, ${doctor.specialty}`,
      date: parsed.data.date,
      time: booking.time,
    });
  } catch (error) {
    // Never report success if the write failed. The detail goes to the server log only.
    console.error("Booking write failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, {
      error: "We could not save your booking. Nothing was booked. Please try again.",
    });
  }
}
