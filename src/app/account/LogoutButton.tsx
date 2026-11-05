"use client";

import { useState } from "react";

type State = { kind: "idle" } | { kind: "saving" } | { kind: "failed"; message: string };

// "Logged out" is shown only after the SERVER says the session is gone (status 200). The first version said it
// the moment the button was pressed, so with the network blocked the page claimed a logout that never happened
// and the session stayed in the database (evidence/08 and 09). Now a failure leaves the person on this page,
// still logged in, with a message that says so.
export default function LogoutButton() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleClick() {
    if (state.kind === "saving") return;
    setState({ kind: "saving" });
    try {
      // A request that hangs on a bad connection must not leave the button stuck: give up after 15 seconds.
      const response = await fetch("/api/logout", { method: "POST", signal: AbortSignal.timeout(15_000) });
      if (response.status === 200) {
        // The session is gone. Leave this page, which still holds the person's name and email.
        window.location.assign("/auth?mode=login");
        return;
      }
      setState({ kind: "failed", message: "We could not log you out. You are still logged in. Please try again." });
    } catch {
      setState({ kind: "failed", message: "We could not reach the server, so you are still logged in. Check your connection and try again." });
    }
  }

  return (
    <>
      <div aria-live="polite">
        {state.kind === "failed" && (
          <p className="message message-error type-body-large" role="alert">{state.message}</p>
        )}
      </div>
      <button className="button submit-button type-label-large" type="button"
        aria-disabled={state.kind === "saving" ? true : undefined} onClick={handleClick}>
        {state.kind === "saving" ? "Logging out…" : "Log out"}
      </button>
    </>
  );
}
