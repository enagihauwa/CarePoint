"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { validateEmail, validateEmailPresence, validatePassword } from "@/lib/validation/auth";
import { CautionIcon, Field, PasswordField } from "./fields";
import ModeLink from "./ModeLink";

type Step =
  | { kind: "email" }
  | { kind: "code"; email: string }
  | { kind: "done" };

const CODE_MESSAGE = "Enter the 6-digit code from the email.";

// Step one asks for a code. Step two takes the code and the new password. The page never says whether the email
// has an account: the server's answer is the same either way, and so are these words.
export default function ResetForm({ focusHeading = false }: { focusHeading?: boolean }) {
  const [step, setStep] = useState<Step>({ kind: "email" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  if (step.kind === "done") {
    return (
      <section className="booking-card confirmation" role="status" aria-labelledby="reset-done">
        <h1 className="confirmation-title type-title-large" id="reset-done" ref={headingRef} tabIndex={-1}>Your password was changed</h1>
        <p className="type-body-large">You have been logged out everywhere, on every phone and computer. Log in with your new password.</p>
        <p className="auth-switch-row type-body-large"><ModeLink mode="login">Go to log in</ModeLink></p>
      </section>
    );
  }
  if (step.kind === "code") {
    return <CodeStep email={step.email} onChangeEmail={() => setStep({ kind: "email" })} onDone={() => setStep({ kind: "done" })} />;
  }
  return <EmailStep headingRef={headingRef} onSent={(email) => setStep({ kind: "code", email })} />;
}

function EmailStep({ headingRef, onSent }: { headingRef: React.RefObject<HTMLHeadingElement | null>; onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // Same rule as login: the format is checked on submit, an empty field on blur.
  const error = attempted ? validateEmail(email) : validateEmailPresence(email);
  const shown = attempted || touched ? error : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setAttempted(true);
    if (validateEmail(email)) {
      document.getElementById("email")?.focus();
      return;
    }
    setSending(true);
    setFailure(null);
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      // Only a 202 counts as "asked". Never say a code was sent on any other answer.
      if (response.status === 202) onSent(email.trim());
      else setFailure(body.error ?? `The server answered with status ${response.status}.`);
    } catch {
      setFailure("Could not reach the server. Check your connection and try again.");
    }
    setSending(false);
  }

  return (
    <>
      <h1 className="book-title type-headline-medium" ref={headingRef} tabIndex={-1}>Reset your password</h1>
      <p className="book-intro type-body-large">Enter the email address you registered with. We will send you a 6-digit code.</p>

      <form className="booking-card booking-form" onSubmit={handleSubmit} noValidate>
        <Field id="email" label="Email address" type="email" inputMode="email" autoComplete="email" value={email}
          onChange={setEmail} onBlur={() => setTouched(true)} error={shown} />

        <div aria-live="polite">
          {failure && <p className="message message-error auth-error type-body-large" role="alert"><CautionIcon /><span>{failure}</span></p>}
          {attempted && error && (
            <p className="message message-error auth-error type-body-large">
              <CautionIcon /><span>Please fix the problem marked below.</span>
            </p>
          )}
        </div>

        <button className="button submit-button type-label-large" type="submit"
          aria-disabled={sending ? true : undefined}
          onClick={(event) => { if (sending) event.preventDefault(); }}>
          {sending ? "Sending…" : "Send code"}
        </button>

        <p className="auth-switch-row type-body-medium">
          <ModeLink mode="login">Back to log in</ModeLink>
        </p>
      </form>
    </>
  );
}

function CodeStep({ email, onChangeEmail, onDone }: { email: string; onChangeEmail: () => void; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverPasswordError, setServerPasswordError] = useState<string | null>(null);
  const [resend, setResend] = useState<{ kind: "idle" } | { kind: "sending" } | { kind: "done"; message: string } | { kind: "failed"; message: string }>({ kind: "idle" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus(); }, []);

  const digits = code.replace(/\s/g, "");
  const codeError = attempted && !/^\d{6}$/.test(digits) ? CODE_MESSAGE : null;
  const passwordError = (attempted ? validatePassword(password) : null) ?? serverPasswordError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setAttempted(true);
    setServerError(null);
    setServerPasswordError(null);
    if (!/^\d{6}$/.test(digits)) { document.getElementById("code")?.focus(); return; }
    if (validatePassword(password)) { document.getElementById("new-password")?.focus(); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: digits, password }),
      });
      const body = await response.json().catch(() => ({}));
      // Only a 200 counts as changed. The server has then ended every session; this page does not pretend.
      if (response.status === 200) { onDone(); return; }
      const passwordMessage = body.fields?.password?.[0];
      if (passwordMessage) {
        setServerPasswordError(passwordMessage);
        setTimeout(() => document.getElementById("new-password")?.focus(), 0);
      } else {
        setServerError(body.error ?? `The server answered with status ${response.status}.`);
        setTimeout(() => document.getElementById("code")?.focus(), 0);
      }
    } catch {
      setServerError("Could not reach the server. Your password was not changed. Check your connection and try again.");
    }
    setSaving(false);
  }

  async function handleResend() {
    if (resend.kind === "sending") return;
    setResend({ kind: "sending" });
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 202) setResend({ kind: "done", message: "If that email has an account, we have sent a new code. The old code no longer works." });
      else setResend({ kind: "failed", message: body.error ?? `The server answered with status ${response.status}.` });
    } catch {
      setResend({ kind: "failed", message: "Could not reach the server. Check your connection and try again." });
    }
  }

  return (
    <>
      <h1 className="book-title type-headline-medium" ref={headingRef} tabIndex={-1}>Choose a new password</h1>
      <p className="book-intro type-body-large">
        If <strong>{email}</strong> has an account, we sent it a 6-digit code. It expires in 10 minutes. If you cannot find it, check your Spam folder too.
      </p>

      <form className="booking-card booking-form" onSubmit={handleSubmit} noValidate>
        <Field id="code" label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code}
          onChange={(value) => { setCode(value); setServerError(null); }} onBlur={() => undefined} error={codeError} />
        <PasswordField id="new-password" label="New password" autoComplete="new-password" value={password}
          hint="Use 8 to 64 characters. Spaces are allowed, but not only spaces."
          onChange={(value) => { setPassword(value); setServerPasswordError(null); }} onBlur={() => undefined} error={passwordError} />

        <div aria-live="polite">
          {serverError && <p className="message message-error auth-error type-body-large" role="alert"><CautionIcon /><span>{serverError}</span></p>}
          {resend.kind === "done" && <p className="message message-info type-body-medium">{resend.message}</p>}
          {resend.kind === "failed" && <p className="message message-error auth-error type-body-medium"><CautionIcon /><span>{resend.message}</span></p>}
        </div>

        <button className="button submit-button type-label-large" type="submit"
          aria-disabled={saving ? true : undefined}
          onClick={(event) => { if (saving) event.preventDefault(); }}>
          {saving ? "Changing…" : "Change password"}
        </button>

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
