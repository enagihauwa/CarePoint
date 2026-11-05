"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { validateEmail, validateEmailPresence, validateLoginPassword } from "@/lib/validation/auth";
import { CautionIcon, Field, PasswordField } from "./fields";
import ModeLink from "./ModeLink";

type FieldName = "email" | "password";

type Result =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "ok"; name: string; emailVerified: boolean }
  | { kind: "failed"; message: string };

export default function LoginForm({ focusHeading = false }: { focusHeading?: boolean }) {
  const [values, setValues] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({ email: false, password: false });
  const [attempted, setAttempted] = useState(false);
  const [result, setResult] = useState<Result>({ kind: "idle" });
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result.kind === "saving") return;
    setAttempted(true);
    const checked = { email: validateEmail(values.email), password: validateLoginPassword(values.password) };
    const first = (["email", "password"] as FieldName[]).find((field) => checked[field]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    setResult({ kind: "saving" });
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim(), password: values.password }),
      });
      const body = await response.json().catch(() => ({}));
      // Only a 200 counts as logged in. The server sets the session cookie itself: this page never sees the token.
      if (response.status === 200) {
        setResult({ kind: "ok", name: body.name ?? "", emailVerified: body.emailVerified === true });
      } else {
        setResult({ kind: "failed", message: body.error ?? `The server answered with status ${response.status}.` });
        setTimeout(() => document.getElementById("email")?.focus(), 0);
      }
    } catch {
      setResult({ kind: "failed", message: "Could not reach the server. Check your connection and try again." });
    }
  }

  if (result.kind === "ok") {
    return (
      <section className="booking-card confirmation" role="status" aria-labelledby="login-done">
        <h1 className="confirmation-title type-title-large" id="login-done">You are logged in{result.name ? `, ${result.name}` : ""}</h1>
        <p className="type-body-large">
          {result.emailVerified
            ? "Your email is verified. Online booking is paused for now, so there is nothing more to do here yet."
            : "Your email is not verified yet. You can log in, but booking will need a verified email. Online booking is paused for now."}
        </p>
        <p className="type-body-large"><a href="/account">Go to my account</a></p>
      </section>
    );
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
          {result.kind === "failed" && (
            <p className="message message-error auth-error type-body-large" role="alert"><CautionIcon /><span>{result.message}</span></p>
          )}
          {attempted && (errors.email || errors.password) && (
            <p className="message message-error auth-error type-body-large">
              <CautionIcon /><span>Please fix the problems marked below.</span>
            </p>
          )}
        </div>

        <button className="button submit-button type-label-large" type="submit"
          aria-disabled={result.kind === "saving" ? true : undefined}
          onClick={(event) => { if (result.kind === "saving") event.preventDefault(); }}>
          {result.kind === "saving" ? "Logging in…" : "Log in"}
        </button>

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
