"use client";

import { useState, type FormEvent } from "react";

type Result =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; id: number }
  | { kind: "failed"; message: string };

const FIELDS = [
  { name: "name", label: "Full name", type: "text", autoComplete: "name" },
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel" },
  { name: "doctor", label: "Doctor", type: "text", autoComplete: "off" },
  { name: "date", label: "Date", type: "date", autoComplete: "off" },
  { name: "time", label: "Time", type: "time", autoComplete: "off" },
] as const;

export default function BookingForm() {
  const [result, setResult] = useState<Result>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult({ kind: "saving" });
    const data = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await response.json().catch(() => ({}));

      // Only a 201 counts as a booking. Anything else is shown as the error it is.
      if (response.status === 201) {
        setResult({ kind: "saved", id: body.id });
      } else {
        setResult({
          kind: "failed",
          message: body.error ?? `The server answered with status ${response.status}.`,
        });
      }
    } catch {
      setResult({ kind: "failed", message: "Could not reach the server. Check your connection and try again." });
    }
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      {FIELDS.map((field) => (
        <div className="field" key={field.name}>
          <label className="field-label type-label-large" htmlFor={field.name}>
            {field.label}
          </label>
          <input
            className="field-input type-body-large"
            id={field.name}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
          />
        </div>
      ))}

      <button className="button type-label-large" type="submit" disabled={result.kind === "saving"}>
        {result.kind === "saving" ? "Booking…" : "Book appointment"}
      </button>

      {result.kind === "saved" && (
        <p className="message message-success type-body-large" role="status">
          Your booking is saved. Booking number {result.id}.
        </p>
      )}
      {result.kind === "failed" && (
        <p className="message message-error type-body-large" role="alert">
          {result.message}
        </p>
      )}
    </form>
  );
}
