import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import "../../styles/book.css";

export const metadata: Metadata = { title: "Terms and privacy notice" };

// PLACEHOLDER. No legal wording is written here on purpose: the terms must come from an
// adapted template or a lawyer-checked document (task-03-client-validation/docs/terms-note.md).
// Replace this page before any real patient uses the form.
export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="book">
        <h1 className="book-title type-headline-medium">Terms and privacy notice</h1>
        <p className="message message-error type-body-large">
          The terms and privacy notice for CarePoint Clinic have not been written yet. This page is a placeholder
          and must be replaced before the clinic uses this form with real patients.
        </p>
      </main>
    </>
  );
}
