"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { validateEmail, validateEmailPresence, validateLoginPassword } from "@/lib/validation/auth";
import { CautionIcon, Field, PasswordField } from "./fields";
import ModeLink from "./ModeLink";

type FieldName = "email" | "password";

export default function LoginForm({ focusHeading = false }: { focusHeading?: boolean }) {
  const [values, setValues] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({ email: false, password: false });
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  // On login the email FORMAT is checked only when the form is submitted. Until then, only
  // an empty field is reported (on blur). The password length rules belong to creating one.
  const errors: Record<FieldName, string | null> = {
    email: attempted ? validateEmail(values.email) : validateEmailPresence(values.email),
    password: validateLoginPassword(values.password),
  };
  const shown: Record<FieldName, string | null> = {
    email: attempted || touched.email ? errors.email : null,
    password: attempted || touched.password ? errors.password : null,
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const checked = { email: validateEmail(values.email), password: validateLoginPassword(values.password) };
    const first = (["email", "password"] as FieldName[]).find((field) => checked[field]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    // Logging in is not connected to anything yet, so say so instead of pretending.
    setSubmitted(true);
  }

  return (
    <>
      <h1 className="book-title type-headline-medium" ref={headingRef} tabIndex={-1}>Log in</h1>
      <p className="book-intro type-body-large">Welcome back to CarePoint.</p>

      <form className="booking-card booking-form" onSubmit={handleSubmit} noValidate>
        <Field id="email" label="Email address" type="email" inputMode="email" autoComplete="email" value={values.email}
          onChange={(email) => setValues((current) => ({ ...current, email }))}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))} error={shown.email} />
        <PasswordField id="password" label="Password" autoComplete="current-password" value={values.password}
          onChange={(password) => setValues((current) => ({ ...current, password }))}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))} error={shown.password} />

        <div aria-live="polite">
          {submitted && (
            <p className="message message-info type-body-large" role="status">
              Logging in is not available yet. Nothing was sent.
            </p>
          )}
          {attempted && (errors.email || errors.password) && (
            <p className="message message-error auth-error type-body-large">
              <CautionIcon /><span>Please fix the problems marked below.</span>
            </p>
          )}
        </div>

        <button className="button submit-button type-label-large" type="submit">Log in</button>

        <p className="auth-switch-row type-body-medium">
          <ModeLink mode="reset">Forgot your password?</ModeLink>
        </p>
        <p className="auth-switch-row type-body-medium">
          New to CarePoint? <ModeLink mode="signup">Create an account</ModeLink>
        </p>
      </form>
    </>
  );
}
