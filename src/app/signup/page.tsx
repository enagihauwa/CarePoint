import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SignupForm from "@/components/auth/SignupForm";
import "../../styles/book.css";
import "../../styles/auth.css";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <SiteHeader />
      <main className="book">
        <SignupForm />
      </main>
    </>
  );
}
