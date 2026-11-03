import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import ResetForm from "@/components/auth/ResetForm";
import "../../styles/book.css";
import "../../styles/auth.css";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPage() {
  return (
    <>
      <SiteHeader />
      <main className="book">
        <ResetForm />
      </main>
    </>
  );
}
