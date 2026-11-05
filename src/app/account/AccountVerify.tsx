"use client";

import { useRouter } from "next/navigation";
import VerifyStep from "@/components/auth/VerifyStep";

// For a patient who logged in without verifying their email. When the code is accepted, the page is read again
// from the server, so "Email status" changes to Verified and this panel goes away.
export default function AccountVerify({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  return <VerifyStep name={name} email={email} embedded onVerified={() => router.refresh()} />;
}
