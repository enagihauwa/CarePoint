"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/auth/fields";

type State = { kind: "idle" } | { kind: "saving" } | { kind: "failed"; message: string };

// Deleting an account is the one thing here that cannot be undone after the grace period, so it asks twice: first a
// button that only opens the form, then the password. The page changes only after the server answers 200.
export default function AccountDeletion({ status, purgeOn, graceDays }: { status: "active" | "pending_deletion"; purgeOn: string | null; graceDays: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function post(url: string, body?: unknown) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    return { status: response.status, json };
  }
  const failure = (json: { error?: string }, code: number) => json.error ?? `The server answered with status ${code}.`;

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "saving") return;
    if (!password) { setState({ kind: "failed", message: "Enter your password to confirm." }); return; }
    setState({ kind: "saving" });
    try {
      const { status: code, json } = await post("/api/account/delete", { password });
      // Only a 200 counts. The server has then ended every session, so this page leaves for the login page.
      if (code === 200) { window.location.assign("/auth?mode=login&notice=deletion"); return; }
      setState({ kind: "failed", message: failure(json, code) });
    } catch {
      setState({ kind: "failed", message: "Could not reach the server. Nothing was changed. Check your connection and try again." });
    }
  }

  async function handleCancel() {
    if (state.kind === "saving") return;
    setState({ kind: "saving" });
    try {
      const { status: code, json } = await post("/api/account/delete/cancel");
      if (code === 200) { setState({ kind: "idle" }); router.refresh(); return; }
      setState({ kind: "failed", message: failure(json, code) });
    } catch {
      setState({ kind: "failed", message: "Could not reach the server. Your account is unchanged. Check your connection and try again." });
    }
  }

  const error = state.kind === "failed" ? <p className="message message-error type-body-medium" role="alert">{state.message}</p> : null;

  if (status === "pending_deletion") {
    return (
      <section className="booking-card" aria-labelledby="deletion-title">
        <h2 className="type-title-medium" id="deletion-title">Your account is scheduled for deletion</h2>
        <p className="type-body-large">
          On or after <strong>{purgeOn}</strong>, your name, email and phone number will be removed. Until then you can change your mind. You cannot book while the deletion is scheduled.
        </p>
        {error}
        <button className="button submit-button type-label-large" type="button" aria-disabled={state.kind === "saving" ? true : undefined} onClick={handleCancel}>
          {state.kind === "saving" ? "Cancelling…" : "Cancel the deletion"}
        </button>
      </section>
    );
  }

  return (
    <section className="booking-card" aria-labelledby="deletion-title">
      <h2 className="type-title-medium" id="deletion-title">Delete my account</h2>
      <p className="type-body-large">
        Your name, email address and phone number are removed after {graceDays} days. Booking and payment records are kept, without your name or contact details. You can cancel any time before then by logging in.
      </p>
      {!open ? (
        <button className="button type-label-large" type="button" onClick={() => setOpen(true)}>I want to delete my account</button>
      ) : (
        <form onSubmit={handleDelete} noValidate className="booking-form">
          <PasswordField id="delete-password" label="Your password, to confirm" autoComplete="current-password" value={password}
            onChange={(value) => { setPassword(value); setState({ kind: "idle" }); }} onBlur={() => undefined} error={null} />
          {error}
          <button className="button submit-button type-label-large" type="submit" aria-disabled={state.kind === "saving" ? true : undefined}>
            {state.kind === "saving" ? "Scheduling…" : "Delete my account"}
          </button>
        </form>
      )}
    </section>
  );
}
