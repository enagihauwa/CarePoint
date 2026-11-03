"use client";

import type { ReactNode } from "react";

export type Mode = "signup" | "login" | "reset";

// A link from one account form to another. It changes the address bar with pushState, which
// Next.js syncs into useSearchParams, so the form swaps WITHOUT a page reload or a request
// to the server. The href is still real, so opening it in a new tab or with JavaScript off
// still works.
export default function ModeLink({ mode, children }: { mode: Mode; children: ReactNode }) {
  const href = `/auth?mode=${mode}`;
  return (
    <a
      className="auth-switch type-label-large"
      href={href}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        window.history.pushState(null, "", href);
      }}
    >
      {children}
    </a>
  );
}
