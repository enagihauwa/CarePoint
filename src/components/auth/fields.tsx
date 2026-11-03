"use client";

import { useState, type HTMLInputTypeAttribute } from "react";

// A caution icon is always shown beside an error message, so an error is never shown by
// colour alone. The icon itself is decoration: the text carries the meaning.
export function CautionIcon() {
  return (
    <svg className="auth-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 2 1 21h22L12 2Zm1 14h-2v-2h2v2Zm0-4h-2V8h2v4Z" />
    </svg>
  );
}

// The slot is always in the page and is a live region, so a screen reader announces an
// error when text appears in it. Every input points at its slot with aria-describedby.
export function ErrorSlot({ id, message }: { id: string; message: string | null }) {
  return (
    <div id={`${id}-error`} className="auth-error-slot" aria-live="polite">
      {message && (
        <p className="auth-error type-body-small">
          <CautionIcon />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  type?: HTMLInputTypeAttribute;
  inputMode?: "text" | "tel" | "email";
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string | null;
  hint?: string | null;
};

const describedBy = (id: string, hint?: string | null) => [hint ? `${id}-hint` : null, `${id}-error`].filter(Boolean).join(" ");

export function Field({ id, label, type = "text", inputMode, autoComplete, value, onChange, onBlur, error, hint }: FieldProps) {
  return (
    <div className="field">
      <label className="field-label type-label-large" htmlFor={id}>{label}</label>
      <input
        className="field-input type-body-large"
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint)}
      />
      {hint && <p className="field-hint type-body-small" id={`${id}-hint`}>{hint}</p>}
      <ErrorSlot id={id} message={error} />
    </div>
  );
}

type PasswordFieldProps = Omit<FieldProps, "type" | "inputMode">;

// A show/hide button helps on a phone, where a typo is easy and nobody can see the keys.
export function PasswordField({ id, label, autoComplete, value, onChange, onBlur, error, hint }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label className="field-label type-label-large" htmlFor={id}>{label}</label>
      <div className="password-row">
        <input
          className="field-input type-body-large"
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint)}
        />
        <button
          type="button"
          className="toggle type-label-large"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {hint && <p className="field-hint type-body-small" id={`${id}-hint`}>{hint}</p>}
      <ErrorSlot id={id} message={error} />
    </div>
  );
}

type TermsCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur: () => void;
  error: string | null;
};

// A real checkbox, so it works from the keyboard (Tab to reach it, Space to tick it).
export function TermsCheckbox({ checked, onChange, onBlur, error }: TermsCheckboxProps) {
  return (
    <div className="field">
      <div className="checkbox-row">
        <input
          id="terms"
          name="terms"
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          onBlur={onBlur}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby="terms-error"
        />
        <label className="type-body-large" htmlFor="terms">
          I agree to the CarePoint <a className="auth-switch" href="/terms">terms and privacy notice</a>
        </label>
      </div>
      <ErrorSlot id="terms" message={error} />
    </div>
  );
}
