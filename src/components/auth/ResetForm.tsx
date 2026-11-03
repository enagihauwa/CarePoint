"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { validateEmail, validateEmailPresence } from "@/lib/validation/auth";
import { CautionIcon, Field } from "./fields";
import ModeLink from "./ModeLink";

export default function ResetForm({ focusHeading = false }: { focusHeading?: boolean }) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  // Same rule as login: the format is checked on submit, an empty field on blur.
  const error = attempted ? validateEmail(email) : validateEmailPresence(email);
  const shown = attempted || touched ? error : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (validateEmail(email)) {
      document.getElementById("email")?.focus();
      return;
    }
    // No email is sent yet, so say so instead of pretending.
    setSubmitted(true);
  }

  return (
    <>
      <h1 className="book-title type-headline-medium" ref={headingRef} tabIndex={-1}>Reset your password</h1>
      <p className="book-intro type-body-large">Enter the email address you registered with.</p>

      <form className="booking-card booking-form" onSubmit={handleSubmit} noValidate>
        <Field id="email" label="Email address" type="email" inputMode="email" autoComplete="email" value={email}
          onChange={setEmail} onBlur={() => setTouched(true)} error={shown} />

        <div aria-live="polite">
          {submitted && (
            <p className="message message-info type-body-large" role="status">
              Password reset is not available yet. No email was sent.
            </p>
          )}
          {attempted && error && (
            <p className="message message-error auth-error type-body-large">
              <CautionIcon /><span>Please fix the problem marked below.</span>
            </p>
          )}
        </div>

        <button className="button submit-button type-label-large" type="submit">Send reset link</button>

        <p className="auth-switch-row type-body-medium">
          <ModeLink mode="login">Back to log in</ModeLink>
        </p>
      </form>
    </>
  );
}
