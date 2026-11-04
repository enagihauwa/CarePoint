"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CautionIcon, Field } from "./fields";

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "verified" }
  | { kind: "failed"; message: string };

const CODE_MESSAGE = "Enter the 6-digit code from the email.";

// Shown after a 201 from /api/register. The page says which address the code went to, because a mistyped
// address gets no code and no error (the first test email in this project bounced that way), and it says
// to check Spam, because the first real email landed there.
export default function VerifyStep({ name, email, onChangeEmail }: { name: string; email: string; onChangeEmail: () => void }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [codeError, setCodeError] = useState<string | null>(null);
  const [resend, setResend] = useState<{ kind: "idle" } | { kind: "sending" } | { kind: "done"; message: string } | { kind: "failed"; message: string }>({ kind: "idle" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus(); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "checking") return;
    const digits = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(digits)) {
      setCodeError(CODE_MESSAGE);
      document.getElementById("code")?.focus();
      return;
    }
    setCodeError(null);
    setState({ kind: "checking" });
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: digits }),
      });
      const body = await response.json().catch(() => ({}));
      // Only a 200 counts as verified.
      if (response.status === 200) {
        setState({ kind: "verified" });
      } else {
        const message = body.error ?? `The server answered with status ${response.status}.`;
        setState({ kind: "failed", message });
        setCodeError(message);
        setTimeout(() => document.getElementById("code")?.focus(), 0);
      }
    } catch {
      setState({ kind: "failed", message: "Could not reach the server. Check your connection and try again." });
    }
  }

  async function handleResend() {
    if (resend.kind === "sending") return;
    setResend({ kind: "sending" });
    try {
      const response = await fetch("/api/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 202) setResend({ kind: "done", message: body.message ?? "If that email can be verified, we have sent a new code." });
      else setResend({ kind: "failed", message: body.error ?? `The server answered with status ${response.status}.` });
    } catch {
      setResend({ kind: "failed", message: "Could not reach the server. Check your connection and try again." });
    }
  }

  if (state.kind === "verified") {
    return (
      <section className="booking-card confirmation" role="status" aria-labelledby="verified-title">
        <h1 className="confirmation-title type-title-large" id="verified-title" ref={headingRef} tabIndex={-1}>Your email is verified, {name}</h1>
        <p className="type-body-large">Your account is ready. Logging in is not available yet, so there is nothing more to do for now.</p>
      </section>
    );
  }

  return (
    <>
      <h1 className="book-title type-headline-medium" ref={headingRef} tabIndex={-1}>Check your email</h1>
      <p className="book-intro type-body-large">
        We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes. If you cannot find it, check your Spam folder too.
      </p>

      <form className="booking-card booking-form" onSubmit={handleSubmit} noValidate>
        <Field id="code" label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code}
          onChange={(value) => { setCode(value); setCodeError(null); }} onBlur={() => undefined} error={codeError} />

        <button className="button submit-button type-label-large" type="submit"
          aria-disabled={state.kind === "checking" ? true : undefined}
          onClick={(event) => { if (state.kind === "checking") event.preventDefault(); }}>
          {state.kind === "checking" ? "Checking…" : "Verify email"}
        </button>

        <div aria-live="polite">
          {state.kind === "failed" && state.message !== codeError && (
            <p className="message message-error auth-error type-body-large" role="alert"><CautionIcon /><span>{state.message}</span></p>
          )}
          {resend.kind === "done" && <p className="message message-info type-body-medium">{resend.message}</p>}
          {resend.kind === "failed" && <p className="message message-error auth-error type-body-medium"><CautionIcon /><span>{resend.message}</span></p>}
        </div>

        <p className="auth-switch-row type-body-medium">
          Did not get a code?{" "}
          <button type="button" className="auth-switch" aria-disabled={resend.kind === "sending" ? true : undefined} onClick={handleResend}>
            {resend.kind === "sending" ? "Sending…" : "Send a new code"}
          </button>
        </p>
        <p className="auth-switch-row type-body-medium">
          Wrong email address?{" "}
          <button type="button" className="auth-switch" onClick={onChangeEmail}>Go back and fix it</button>
        </p>
      </form>
    </>
  );
}
