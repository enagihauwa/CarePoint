import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/currentUser";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import "../../styles/book.css";
import "../../styles/auth.css";
import RecordPaymentForm from "./RecordPaymentForm";

export const metadata: Metadata = { title: "Front desk" };
export const dynamic = "force-dynamic";

// How many bookings the page lists. A page size, not a business rule: the newest 50 are enough for one desk.
const PAGE_SIZE = 50;

const METHOD_LABEL = { cash: "cash", transfer: "bank transfer", pos: "POS" } as const;

export default async function AdminPage() {
  // The proxy only checked that a cookie exists. THIS is the real check, and the role is checked here too:
  // no session -> log in; a session that is not staff -> a real 403. No booking data is read before both pass.
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login&next=/admin");
  if (user.role !== "admin") forbidden();

  const bookings = await prisma.booking.findMany({
    orderBy: [{ date: "desc" }, { time: "desc" }],
    take: PAGE_SIZE,
    include: {
      doctor: { select: { name: true } },
      patient: { select: { phone: true, user: { select: { name: true } } } },
      payments: { orderBy: { id: "desc" }, include: { recordedBy: { select: { name: true } } } },
    },
  });

  return (
    <>
      <SiteHeader />
      <main className="book">
        <h1 className="book-title type-headline-medium">Front desk</h1>
        <p className="book-intro type-body-large">Newest {PAGE_SIZE} bookings. Record a payment once the patient has paid at the desk.</p>

        {bookings.length === 0 ? (
          <p className="message message-info type-body-large">There are no bookings yet.</p>
        ) : (
          bookings.map((booking) => {
            const paid = booking.payments.find((payment) => payment.status === "paid");
            return (
              <section key={booking.id} className="booking-card confirmation" aria-label={`Booking ${booking.id}`}>
                <h2 className="confirmation-title type-title-medium">Booking {booking.id}: {booking.patient.user.name}</h2>
                <dl className="confirmation-details type-body-large">
                  <dt>Doctor</dt><dd>{booking.doctor.name}</dd>
                  <dt>When</dt><dd>{booking.date.toISOString().slice(0, 10)} at {booking.time}</dd>
                  <dt>Phone</dt><dd>{booking.patient.phone}</dd>
                  <dt>Payment</dt>
                  <dd>
                    {paid
                      ? `Paid ${formatNaira(paid.amountKobo)} by ${paid.method ? METHOD_LABEL[paid.method] : "unknown"}, recorded by ${paid.recordedBy.name}, reference ${paid.reference}`
                      : "Not paid yet"}
                  </dd>
                </dl>
                {!paid && <RecordPaymentForm bookingId={booking.id} />}
              </section>
            );
          })
        )}
      </main>
    </>
  );
}
