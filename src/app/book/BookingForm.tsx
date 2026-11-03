"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { CautionIcon, ErrorSlot } from "@/components/auth/fields";

export type DoctorOption = { id: number; name: string; specialty: string };

type Confirmation = { id: number; doctor: string; date: string; time: string };
type Result =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; booking: Confirmation }
  | { kind: "failed"; message: string; fields: Record<string, string[]> };

// The ids of the inputs, in page order. The date and time inputs are one field for the patient.
const FIELD_ORDER = ["name", "phone", "doctorId", "datetime"] as const;
type FieldId = (typeof FIELD_ORDER)[number];

// The server validates date and time separately. The patient sees one field, so show whichever failed.
function messagesFor(fields: Record<string, string[]>): Record<FieldId, string | null> {
  return {
    name: fields.name?.[0] ?? null,
    phone: fields.phone?.[0] ?? null,
    doctorId: fields.doctorId?.[0] ?? null,
    datetime: fields.date?.[0] ?? fields.time?.[0] ?? null,
  };
}

const describedBy = (id: string, hint?: boolean) => [hint ? `${id}-hint` : null, `${id}-error`].filter(Boolean).join(" ");

export default function BookingForm({ doctors }: { doctors: DoctorOption[] }) {
  const [result, setResult] = useState<Result>({ kind: "idle" });
  // False until this script has run in the browser. Until then the button is really disabled, so
  // a form whose script never loaded cannot fall back to a plain page submit.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const confirmationRef = useRef<HTMLHeadingElement>(null);

  const saving = result.kind === "saving";
  const errors = messagesFor(result.kind === "failed" ? result.fields : {});

  // After a failed submit, move focus to the first problem. After a successful booking, move it to
  // the confirmation, so a keyboard or screen-reader user is never left on nothing.
  useEffect(() => {
    if (result.kind === "failed") {
      const first = FIELD_ORDER.find((id) => messagesFor(result.fields)[id]);
      if (first) document.getElementById(first)?.focus();
    }
    if (result.kind === "saved") confirmationRef.current?.focus();
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setResult({ kind: "saving" });
    const { datetime, ...rest } = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    // One "Date and time" field for the patient. The API and the database keep them separate.
    const [date = "", time = ""] = (datetime ?? "").split("T");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rest, date, time }),
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

  // The button stays in the tab order while saving (aria-disabled, not disabled), so focus stays on it.
  function handleButtonClick(event: MouseEvent<HTMLButtonElement>) {
    if (saving) event.preventDefault();
  }

  if (result.kind === "saved") {
    const { booking } = result;
    return (
      <section className="booking-card confirmation" aria-labelledby="confirmation-title">
        <h2 className="confirmation-title type-title-large" id="confirmation-title" ref={confirmationRef} tabIndex={-1}>
          Your booking is saved
        </h2>
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

  return (
    // method="post" so that, whatever happens, names and phone numbers never go into a URL.
    <form className="booking-card booking-form" method="post" onSubmit={handleSubmit} noValidate>
      <fieldset className="field-group">
        <legend className="group-title type-title-medium">Your details</legend>

        <div className="field">
          <label className="field-label type-label-large" htmlFor="name">Full name</label>
          <input className="field-input type-body-large" id="name" name="name" type="text"
            autoComplete="name" required aria-invalid={errors.name ? true : undefined} aria-describedby={describedBy("name")} />
          <ErrorSlot id="name" message={errors.name} />
        </div>

        <div className="field">
          <label className="field-label type-label-large" htmlFor="phone">Phone number</label>
          <input className="field-input type-body-large" id="phone" name="phone" type="tel"
            autoComplete="tel" required aria-invalid={errors.phone ? true : undefined} aria-describedby={describedBy("phone", true)} />
          <p className="field-hint type-body-small" id="phone-hint">We&apos;ll call this number to confirm your visit.</p>
          <ErrorSlot id="phone" message={errors.phone} />
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend className="group-title type-title-medium">Appointment</legend>

        <div className="field">
          <label className="field-label type-label-large" htmlFor="doctorId">Doctor</label>
          <select className="field-input type-body-large" id="doctorId" name="doctorId" required defaultValue=""
            aria-invalid={errors.doctorId ? true : undefined} aria-describedby={describedBy("doctorId")}>
            <option value="" disabled>Choose a doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.name} — {doctor.specialty}</option>
            ))}
          </select>
          <ErrorSlot id="doctorId" message={errors.doctorId} />
        </div>

        <div className="field">
          <label className="field-label type-label-large" htmlFor="datetime">Date and time</label>
          <input className="field-input type-body-large" id="datetime" name="datetime" type="datetime-local"
            required aria-invalid={errors.datetime ? true : undefined} aria-describedby={describedBy("datetime", true)} />
          <p className="field-hint type-body-small" id="datetime-hint">
            This has five parts: day, month, year, hour and minute. Type each part, or use the arrow keys to change it.
          </p>
          <ErrorSlot id="datetime" message={errors.datetime} />
        </div>
      </fieldset>

      {result.kind === "failed" && (
        <p className="message message-error auth-error type-body-large" role="alert">
          <CautionIcon /><span>{result.message}</span>
        </p>
      )}

      {!ready && (
        <p className="message message-error type-body-medium">
          The booking form has not finished loading, so it cannot book yet. If this message stays, reload the
          page or check your connection.
        </p>
      )}

      <button className="button submit-button type-label-large" type="submit"
        disabled={!ready} aria-disabled={saving ? true : undefined} onClick={handleButtonClick}>
        {saving ? "Booking…" : "Book appointment"}
      </button>
    </form>
  );
}
