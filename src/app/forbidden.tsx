import SiteHeader from "@/components/SiteHeader";
import "../styles/book.css";

// Shown, with a real HTTP 403, when a logged-in person opens a page their account is not allowed to use.
export default function Forbidden() {
  return (
    <>
      <SiteHeader />
      <main className="book">
        <h1 className="book-title type-headline-medium">You do not have access to this page</h1>
        <p className="book-intro type-body-large">This page is for front-desk staff. If you are a patient, you can <a href="/book">book an appointment</a> or go to <a href="/account">your account</a>.</p>
      </main>
    </>
  );
}
