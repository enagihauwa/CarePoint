import Link from "next/link";
import type { ReactNode } from "react";

export type Mode = "signup" | "login" | "reset";

// A link from one account form to another. Today each form is its own page.
export default function ModeLink({ mode, children }: { mode: Mode; children: ReactNode }) {
  return (
    <Link className="auth-switch type-label-large" href={`/${mode}`}>
      {children}
    </Link>
  );
}
