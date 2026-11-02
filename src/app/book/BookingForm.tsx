"use client";

import { useEffect, useState, type FormEvent } from "react";

export type DoctorOption = { id: number; name: string; specialty: string };

type Confirmation = { id: number; doctor: string; date: string; time: string };
type Result =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; booking: Confirmation }
  | { kind: "failed"; message: string; fields: Record<string, string[]> };

export default function BookingForm({ doctors }: { doctors: DoctorOption[] }) {
  const [result, setResult] = useState<Result>({ kind: "idle" });
  // False until this script has run in the browser. If the script never loads, the
  // button stays disabled, so the form cannot fall back to a silent reload.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const fieldErrors = result.kind === "failed" ? result.fields : {};

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
        setResult({ kind: "saved", booking: body });
      } else {
        setResult({
          kind: "failed",
          message: body.error ?? `The server answered with status ${response.status}.`,
          fields: body.fields ?? {},
        });
      }
    } catch {
      setResult({
        kind: "failed",
        message: "Could not reach the server. Check your connection and try again.",
        fields: {},
      });
    }
  }

  if (result.kind === "saved") {
    const { booking } = result;
    return (
      <section className="booking-card confirmation" role="status" aria-labelledby="confirmation-title">
        <h2 className="confirmation-title type-title-large" id="confirmation-title">Your booking is saved</h2>
        <dl className="confirmation-details">
          <dt className="type-label-large">Booking number</dt>
          <dd className="type-body-large">{booking.id}</dd>
          <dt className="type-label-large">Doctor</dt>
          <dd className="type-body-large">{booking.doctor}</dd>
          <dt className="type-label-large">Date and time</dt>
          <dd className="type-body-large">{booking.date} at {booking.time}</dd>
        </dl>
        <p className="type-body-medium">No payment is needed now. Keep your booking number for your visit.</p>
      </section>
    );
  }

  // Shows the server's message for one field, linked to its input for screen readers.
  const error = (field: string) =>
    fieldErrors[field]?.length ? (
      <p className="field-error type-body-small" id={`${field}-error`}>{fieldErrors[field][0]}</p>
    ) : null;
  const describedBy = (field: string, hint?: boolean) =>
    [hint && `${field}-hint`, fieldErrors[field]?.length && `${field}-error`].filter(Boolean).join(" ") || undefined;

  return (
    // method="post" so that, whatever happens, names and phone numbers never go into a URL.
    <form className="booking-card booking-form" method="post" onSubmit={handleSubmit} noValidate>
      <fieldset className="field-group">
        <legend className="group-title type-title-medium">Your details</legend>

        <div className="field">
          <label className="field-label type-label-large" htmlFor="name">Full name</label>
          <input className="field-input type-body-large" id="name" name="name" type="text"
            autoComplete="name" required aria-invalid={!!fieldErrors.name} aria-describedby={describedBy("name")} />
          {error("name")}
        </div>

        <div className="field">
          <label className="field-label type-label-large" htmlFor="phone">Phone number</label>
          <input className="field-input type-body-large" id="phone" name="phone" type="tel"
            autoComplete="tel" required aria-invalid={!!fieldErrors.phone} aria-describedby={describedBy("phone", true)} />
          <p className="field-hint type-body-small" id="phone-hint">We&apos;ll call this number to confirm your visit.</p>
          {error("phone")}
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend className="group-title type-title-medium">Appointment</legend>

        <div className="field">
          <label className="field-label type-label-large" htmlFor="doctorId">Doctor</label>
          <select className="field-input type-body-large" id="doctorId" name="doctorId" required defaultValue=""
            aria-invalid={!!fieldErrors.doctorId} aria-describedby={describedBy("doctorId")}>
            <option value="" disabled>Choose a doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.name} — {doctor.specialty}</option>
            ))}
          </select>
          {error("doctorId")}
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label type-label-large" htmlFor="date">Date</label>
            <input className="field-input type-body-large" id="date" name="date" type="date"
              required aria-invalid={!!fieldErrors.date} aria-describedby={describedBy("date")} />
            {error("date")}
          </div>
          <div className="field">
            <label className="field-label type-label-large" htmlFor="time">Time</label>
            <input className="field-input type-body-large" id="time" name="time" type="time"
              required aria-invalid={!!fieldErrors.time} aria-describedby={describedBy("time")} />
            {error("time")}
          </div>
        </div>
      </fieldset>

      {result.kind === "failed" && (
        <p className="message message-error type-body-large" role="alert">{result.message}</p>
      )}

      {!ready && (
        <p className="message message-error type-body-medium" role="alert">
          The booking form has not finished loading, so it cannot book yet. If this message stays, reload the
          page or check your connection.
        </p>
      )}

      <button className="button submit-button type-label-large" type="submit"
        disabled={!ready || result.kind === "saving"}>
        {result.kind === "saving" ? "Booking…" : "Book appointment"}
      </button>
    </form>
  );
}
