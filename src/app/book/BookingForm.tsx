"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { CautionIcon, ErrorSlot } from "@/components/auth/fields";

export type DoctorOption = { id: number; name: string; specialty: string };
// Who is logged in, or null. Only what the page needs to say "Booking as ...".
export type Account = { name: string; emailVerified: boolean } | null;

type Confirmation = { id: number; doctor: string; date: string; time: string };
type Result =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; booking: Confirmation }
  | { kind: "failed"; message: string; code: string | null; fields: Record<string, string[]> };

// The ids of the inputs, in page order. The date and time inputs are one field for the patient.
const FIELD_ORDER = ["doctorId", "datetime"] as const;
type FieldId = (typeof FIELD_ORDER)[number];

// The server validates date and time separately. The patient sees one field, so show whichever failed.
function messagesFor(fields: Record<string, string[]>): Record<FieldId, string | null> {
  return {
    doctorId: fields.doctorId?.[0] ?? null,
    datetime: fields.date?.[0] ?? fields.time?.[0] ?? null,
  };
}

const describedBy = (id: string, hint?: boolean) => [hint ? `${id}-hint` : null, `${id}-error`].filter(Boolean).join(" ");

// Soft gating (docs/decisions.md, decision 3): anyone may look and choose. What they chose is kept in THIS tab
// only (sessionStorage), so a person who has to log in does not type it twice. It holds a doctor and a time and
// nothing personal, and it is cleared after a booking is saved. Storage can be blocked, so every use is wrapped.
const DRAFT_KEY = "carepoint_booking_draft";
function readDraft(): { doctorId: string; datetime: string } {
  try {
    const raw = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}");
    return { doctorId: typeof raw.doctorId === "string" ? raw.doctorId : "", datetime: typeof raw.datetime === "string" ? raw.datetime : "" };
  } catch {
    return { doctorId: "", datetime: "" };
  }
}
function writeDraft(draft: { doctorId: string; datetime: string }) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage blocked: nothing is kept, nothing breaks */ }
}
function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

export default function BookingForm({ doctors, account }: { doctors: DoctorOption[]; account: Account }) {
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [doctorId, setDoctorId] = useState("");
  const [datetime, setDatetime] = useState("");
  // False until this script has run in the browser. Until then the button is really disabled, so
  // a form whose script never loaded cannot fall back to a plain page submit.
  const [ready, setReady] = useState(false);
  const confirmationRef = useRef<HTMLHeadingElement>(null);

  // Restore what was chosen before a login. Only a doctor that still exists is restored.
  useEffect(() => {
    const draft = readDraft();
    if (doctors.some((doctor) => String(doctor.id) === draft.doctorId)) setDoctorId(draft.doctorId);
    setDatetime(draft.datetime);
    setReady(true);
  }, [doctors]);

  const saving = result.kind === "saving";
  const errors = messagesFor(result.kind === "failed" ? result.fields : {});
  const needsLogin = result.kind === "failed" && result.code === "login_required";
  const needsVerify = result.kind === "failed" && result.code === "verify_required";

  // After a failed submit, move focus to the first problem. After a successful booking, move it to
  // the confirmation, so a keyboard or screen-reader user is never left on nothing.
  useEffect(() => {
    if (result.kind === "failed") {
      const first = FIELD_ORDER.find((id) => messagesFor(result.fields)[id]);
      if (first) document.getElementById(first)?.focus();
    }
    if (result.kind === "saved") confirmationRef.current?.focus();
  }, [result]);

  function choose(next: { doctorId: string; datetime: string }) {
    setDoctorId(next.doctorId);
    setDatetime(next.datetime);
    writeDraft(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setResult({ kind: "saving" });
    // One "Date and time" field for the patient. The API and the database keep them separate.
    const [date = "", time = ""] = datetime.split("T");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, date, time }),
      });
      const body = await response.json().catch(() => ({}));

      // Only a 201 counts as a booking. Anything else is shown as the error it is.
      if (response.status === 201) {
        clearDraft();
        setResult({ kind: "saved", booking: body });
      } else {
        setResult({
          kind: "failed",
          message: body.error ?? `The server answered with status ${response.status}.`,
          code: typeof body.code === "string" ? body.code : null,
          fields: body.fields ?? {},
        });
      }
    } catch {
      setResult({
        kind: "failed",
        message: "Could not reach the server. Check your connection and try again.",
        code: null,
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
    // method="post" so that, whatever happens, nothing typed here can go into a URL.
    <form className="booking-card booking-form" method="post" onSubmit={handleSubmit} noValidate>
      <p className="type-body-large">
        {account
          ? <>Booking as <strong>{account.name}</strong>. Your name and phone number come from your account.</>
          : "You can choose a doctor and a time first. We will ask you to log in or create an account when you confirm."}
      </p>

      <fieldset className="field-group">
        <legend className="group-title type-title-medium">Appointment</legend>

        <div className="field">
          <label className="field-label type-label-large" htmlFor="doctorId">Doctor</label>
          <select className="field-input type-body-large" id="doctorId" name="doctorId" required value={doctorId}
            onChange={(event) => choose({ doctorId: event.target.value, datetime })}
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
          <input className="field-input type-body-large" id="datetime" name="datetime" type="datetime-local" required value={datetime}
            onChange={(event) => choose({ doctorId, datetime: event.target.value })}
            aria-invalid={errors.datetime ? true : undefined} aria-describedby={describedBy("datetime", true)} />
          <p className="field-hint type-body-small" id="datetime-hint">
            This has five parts: day, month, year, hour and minute. Type each part, or use the arrow keys to change it.
          </p>
          <ErrorSlot id="datetime" message={errors.datetime} />
        </div>
      </fieldset>

      {result.kind === "failed" && (
        <div className="message message-error auth-error type-body-large" role="alert">
          <p><CautionIcon /><span>{result.message}</span></p>
          {needsLogin && (
            <p>We kept your choices. <a href="/auth?mode=login&next=/book">Log in</a> or <a href="/auth?mode=signup">create an account</a>, then come back to this page.</p>
          )}
          {needsVerify && <p><a href="/account">Go to your account to verify your email</a>.</p>}
        </div>
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
