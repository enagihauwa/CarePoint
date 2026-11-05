"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type State = { kind: "idle" } | { kind: "saving" } | { kind: "failed"; message: string };

// One small form per unpaid booking. The page says "paid" only after the server answers 201: it reads the list again
// from the server (router.refresh), so what is on screen is what is in the database.
export default function RecordPaymentForm({ bookingId }: { bookingId: number }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "saving") return;
    const form = new FormData(event.currentTarget);
    setState({ kind: "saving" });
    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, amount: String(form.get("amount") ?? ""), method: String(form.get("method") ?? "") }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 201) {
        router.refresh();
        return;
      }
      const field = Object.values(body.fields ?? {}).flat()[0];
      setState({ kind: "failed", message: String(field ?? body.error ?? `The server answered with status ${response.status}.`) });
    } catch {
      setState({ kind: "failed", message: "Could not reach the server. Nothing was recorded. Check your connection and try again." });
    }
  }

  const id = `booking-${bookingId}`;
  return (
    <form onSubmit={handleSubmit} noValidate className="admin-pay">
      <label className="type-label-large" htmlFor={`${id}-amount`}>Amount paid (naira)</label>
      <input className="field-input type-body-large" id={`${id}-amount`} name="amount" inputMode="decimal" autoComplete="off" />
      <label className="type-label-large" htmlFor={`${id}-method`}>Paid by</label>
      <select className="field-input type-body-large" id={`${id}-method`} name="method" defaultValue="">
        <option value="" disabled>Choose</option>
        <option value="cash">Cash</option>
        <option value="transfer">Bank transfer</option>
        <option value="pos">POS</option>
      </select>
      {state.kind === "failed" && <p className="message message-error type-body-medium" role="alert">{state.message}</p>}
      <button className="button submit-button type-label-large" type="submit" aria-disabled={state.kind === "saving" ? true : undefined}>
        {state.kind === "saving" ? "Recording…" : "Record as paid"}
      </button>
    </form>
  );
}
