import { respond } from "@/lib/respond";

// Online booking is PAUSED. A booking now has to belong to a patient (Booking.patientId is required,
// task-04-server-source-of-truth/docs/schema.md), and nobody can log in yet: login and sessions are
// Task 5. Until then this answers honestly instead of saving a booking that belongs to nobody.
// The old name-and-phone version of this route is in git history (before commit "pause online booking").
export async function POST(request: Request) {
  const started = performance.now();
  return respond(request, started, 503, {
    error: "Online booking is paused while patient accounts are added. Please contact the front desk to book.",
  });
}
