import type { Metadata } from "next";
import "../../styles/book.css";
import BookingForm from "./BookingForm";

export const metadata: Metadata = {
  title: "Book an appointment | CarePoint Clinic",
};

export default function BookPage() {
  return (
    <main className="book">
      <h1 className="book-title type-headline-small">Book an appointment</h1>
      <p className="book-intro type-body-large">No payment is needed to book.</p>
      <BookingForm />
    </main>
  );
}
