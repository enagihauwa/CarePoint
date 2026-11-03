"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { validateEmail, validateName, validatePassword, validatePhone, validateTerms } from "@/lib/validation/auth";
import { CautionIcon, Field, PasswordField, TermsCheckbox } from "./fields";
import ModeLink from "./ModeLink";

type Result =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; name: string }
  | { kind: "failed"; message: string };

type FieldName = "name" | "email" | "phone" | "password" | "terms";
const ORDER: FieldName[] = ["name", "email", "phone", "password", "terms"];

export default function SignupForm({ focusHeading = false }: { focusHeading?: boolean }) {
  const [values, setValues] = useState({ name: "", email: "", phone: "", password: "" });
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    name: false, email: false, phone: false, password: false, terms: false,
  });
  const [passwordStarted, setPasswordStarted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  const errors: Record<FieldName, string | null> = {
    name: validateName(values.name),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    password: validatePassword(values.password),
    terms: validateTerms(terms),
  };
  const invalid = ORDER.some((field) => errors[field]);

  // Empty fields are reported when the patient leaves them (on blur). The email format is
  // checked in real time, as soon as something has been typed.
  const show = (field: FieldName) => attempted || touched[field];
  const shown: Record<FieldName, string | null> = {
    name: show("name") ? errors.name : null,
    email: show("email") || values.email !== "" ? errors.email : null,
    phone: show("phone") ? errors.phone : null,
    password: show("password") ? errors.password : null,
    terms: show("terms") ? errors.terms : null,
  };
  const touch = (field: FieldName) => setTouched((current) => ({ ...current, [field]: true }));
  const setValue = (field: keyof typeof values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (field === "password") setPasswordStarted(true);
  };

  const onlyTerms = errors.terms !== null && ORDER.filter((field) => field !== "terms").every((field) => !errors[field]);
  const summary = attempted && invalid
    ? onlyTerms ? errors.terms : "Please fix the problems marked below before creating your account."
    : null;

  // The button stays in the tab order (aria-disabled, not disabled). Pressing it while the
  // form is not ready explains why and moves focus to the first problem.
  function handleButtonClick(event: MouseEvent<HTMLButtonElement>) {
    if (result.kind === "saving") {
      event.preventDefault();
      return;
    }
    if (invalid) {
      event.preventDefault();
      setAttempted(true);
      const first = ORDER.find((field) => errors[field]);
      if (first) document.getElementById(first)?.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid) return;
    setResult({ kind: "saving" });
    try {
      // The password is not sent: it is stored only once Task 4 adds hashing.
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, email: values.email, phone: values.phone, termsAccepted: terms }),
      });
      const body = await response.json().catch(() => ({}));
      // Only a 201 counts as saved. Anything else is shown as the error it is.
      if (response.status === 201) setResult({ kind: "saved", name: values.name.trim() });
      else setResult({ kind: "failed", message: body.error ?? `The server answered with status ${response.status}.` });
    } catch {
      setResult({ kind: "failed", message: "Could not reach the server. Check your connection and try again." });
    }
  }

  if (result.kind === "saved") {
    return (
      <section className="booking-card confirmation" role="status" aria-labelledby="signup-done">
        <h1 className="confirmation-title type-title-large" id="signup-done">Thank you, {result.name}</h1>
        <p className="type-body-large">Your details are saved. Logging in is not available yet, so there is nothing more to do for now.</p>
      </section>
    );
  }

  return (
    <>
      <h1 className="book-title type-headline-medium" ref={headingRef} tabIndex={-1}>Create your account</h1>
      <p className="book-intro type-body-large">So the front desk can find your bookings and reach you.</p>

      <form className="booking-card booking-form" onSubmit={handleSubmit} noValidate>
        <Field id="name" label="Full name" autoComplete="name" value={values.name}
          onChange={setValue("name")} onBlur={() => touch("name")} error={shown.name} />
        <Field id="email" label="Email address" type="email" inputMode="email" autoComplete="email" value={values.email}
          onChange={setValue("email")} onBlur={() => touch("email")} error={shown.email} />
        <Field id="phone" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" value={values.phone}
          hint="We'll call this number to confirm your visit."
          onChange={setValue("phone")} onBlur={() => touch("phone")} error={shown.phone} />
        <PasswordField id="password" label="Password" autoComplete="new-password" value={values.password}
          hint={passwordStarted ? "Use 8 to 64 characters. Spaces are allowed, but not only spaces." : null}
          onChange={setValue("password")} onBlur={() => touch("password")} error={shown.password} />
        <TermsCheckbox checked={terms} onChange={(checked) => { setTerms(checked); touch("terms"); }}
          onBlur={() => touch("terms")} error={shown.terms} />

        <div aria-live="polite">
          {summary && (
            <p className="message message-error auth-error type-body-large"><CautionIcon /><span>{summary}</span></p>
          )}
          {result.kind === "failed" && (
            <p className="message message-error auth-error type-body-large" role="alert"><CautionIcon /><span>{result.message}</span></p>
          )}
        </div>

        <button className="button submit-button type-label-large" type="submit"
          aria-disabled={invalid || result.kind === "saving" ? true : undefined} onClick={handleButtonClick}>
          {result.kind === "saving" ? "Saving…" : "Create account"}
        </button>

        <p className="auth-switch-row type-body-medium">
          Already have an account? <ModeLink mode="login">Log in</ModeLink>
        </p>
      </form>
    </>
  );
}
