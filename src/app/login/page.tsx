import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import LoginForm from "@/components/auth/LoginForm";
import "../../styles/book.css";
import "../../styles/auth.css";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="book">
        <LoginForm />
      </main>
    </>
  );
}
