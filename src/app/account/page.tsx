import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/currentUser";
import { GRACE_DAYS, purgeDate } from "@/lib/deletionConfig";
import "../../styles/book.css";
import "../../styles/auth.css";
import AccountDeletion from "./AccountDeletion";
import AccountVerify from "./AccountVerify";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = { title: "My account" };

// Read the session on every request, never once at build time.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  // proxy.ts already turned away people with no cookie. This is the real check: a cookie that is made up,
  // logged out, revoked or expired gets no user here, and is sent to log in.
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");

  return (
    <>
      <SiteHeader />
      <main className="book">
        <h1 className="book-title type-headline-medium">My account</h1>
        <section className="booking-card confirmation" aria-label="Account details">
          <dl className="confirmation-details type-body-large">
            <dt>Name</dt>
            <dd>{user.name}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Email status</dt>
            <dd>{user.emailVerified ? "Verified" : "Not verified yet"}</dd>
          </dl>
          <LogoutButton />
        </section>
        {!user.emailVerified && user.role === "patient" && user.status === "active" && <AccountVerify name={user.name} email={user.email} />}
        {user.role === "patient" && (
          <AccountDeletion
            status={user.status}
            graceDays={GRACE_DAYS}
            purgeOn={user.deletionRequestedAt ? purgeDate(user.deletionRequestedAt).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "Africa/Lagos" }) : null}
          />
        )}
      </main>
    </>
  );
}
