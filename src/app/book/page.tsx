import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { prisma } from "@/lib/db";
import "../../styles/book.css";
import BookingForm, { type DoctorOption } from "./BookingForm";

export const metadata: Metadata = {
  title: "Book an appointment | CarePoint Clinic",
};

// Read the doctors on every request, not once at build time.
export const dynamic = "force-dynamic";

async function loadDoctors(): Promise<DoctorOption[] | null> {
  try {
    return await prisma.doctor.findMany({
      select: { id: true, name: true, specialty: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Could not load doctors:", error instanceof Error ? error.message : error);
    return null;
  }
}

export default async function BookPage() {
  const doctors = await loadDoctors();

  return (
    <>
      <SiteHeader />
      <main className="book">
        <h1 className="book-title type-headline-medium">Book an appointment</h1>
        <p className="book-intro type-body-large">
          Choose a doctor and a time that suits you. No payment is needed to book.
        </p>

        {doctors === null ? (
          <p className="message message-error type-body-large" role="alert">
            We can&apos;t load the list of doctors right now, so booking is unavailable. Please try again later.
          </p>
        ) : doctors.length === 0 ? (
          <p className="message message-error type-body-large" role="alert">
            No doctors are available to book yet.
          </p>
        ) : (
          <BookingForm doctors={doctors} />
        )}
      </main>
    </>
  );
}
