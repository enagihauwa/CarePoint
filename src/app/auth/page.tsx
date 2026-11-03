import type { Metadata } from "next";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import AuthSwitcher from "@/components/auth/AuthSwitcher";
import "../../styles/book.css";
import "../../styles/auth.css";

export const metadata: Metadata = { title: "Account" };

export default function AuthPage() {
  return (
    <>
      <SiteHeader />
      <main className="book">
        <Suspense fallback={null}>
          <AuthSwitcher />
        </Suspense>
      </main>
    </>
  );
}
