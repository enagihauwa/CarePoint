// The registration and login rules from task-03-client-validation/docs/validation-rules.md.
// Each check returns the error message to show, or null when the value is fine.
// These run in the browser only. The server does not enforce any of them yet (Task 4).

export const LIMITS = {
  nameMin: 2,
  nameMax: 100,
  phoneInternationalMinDigits: 8,
  phoneInternationalMaxDigits: 15,
  passwordMin: 8,
  passwordMax: 64,
} as const;

export const MESSAGES = {
  nameEmpty: "Please enter your full name.",
  nameLength: "Your name should be between 2 and 100 characters.",
  emailEmpty: "Please enter your email address.",
  emailFormat: "Enter an email address like name@example.com.",
  phoneEmpty: "Please enter your phone number so the front desk can reach you.",
  phoneFormat: "Enter a Nigerian number like 08031234567, or an international number starting with +.",
  passwordEmpty: "Please create a password with at least 8 characters.",
  passwordLoginEmpty: "Please enter your password.",
  passwordShort: "Your password needs at least 8 characters.",
  passwordLong: "Your password can be at most 64 characters.",
  passwordSpaces: "Your password can't be only spaces.",
  // Only the server checks this (src/lib/breachCheck.ts), when a password is first chosen.
  passwordBreached: "This password has appeared in a known data breach. Please choose a different one.",
  termsEmpty: "Please accept the terms before creating your account.",
} as const;

// Spaces at the start and end of a name or an email are removed before checking.
export function validateName(raw: string): string | null {
  const name = raw.trim();
  if (name === "") return MESSAGES.nameEmpty;
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) return MESSAGES.nameLength;
  return null;
}

// Spaces and hyphens are allowed while typing and removed before checking.
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export function validatePhone(raw: string): string | null {
  const phone = normalizePhone(raw);
  if (phone === "") return MESSAGES.phoneEmpty;
  const nigerianLocal = /^0\d{10}$/;
  const international = new RegExp(
    `^\\+\\d{${LIMITS.phoneInternationalMinDigits},${LIMITS.phoneInternationalMaxDigits}}$`,
  );
  return nigerianLocal.test(phone) || international.test(phone) ? null : MESSAGES.phoneFormat;
}

// Only that something is there. Used for the login email while the patient is still typing.
export function validateEmailPresence(raw: string): string | null {
  return raw.trim() === "" ? MESSAGES.emailEmpty : null;
}

// Structure only: something, one @, then a domain with at least one dot. Whether the
// address exists is never checked. Ownership is proved later by a code sent to it.
export function validateEmail(raw: string): string | null {
  const email = raw.trim();
  if (email === "") return MESSAGES.emailEmpty;
  return /^[^\s@]+@([^\s@.]+\.)+[^\s@.]+$/.test(email) ? null : MESSAGES.emailFormat;
}

// A password is never trimmed. Spaces inside are fine, but not only spaces.
export function validatePassword(raw: string): string | null {
  if (raw === "") return MESSAGES.passwordEmpty;
  if (raw.trim() === "") return MESSAGES.passwordSpaces;
  if (raw.length < LIMITS.passwordMin) return MESSAGES.passwordShort;
  if (raw.length > LIMITS.passwordMax) return MESSAGES.passwordLong;
  return null;
}

// Login only checks that a password was typed. The length rules belong to creating one.
export function validateLoginPassword(raw: string): string | null {
  return raw === "" ? MESSAGES.passwordLoginEmpty : null;
}

export function validateTerms(accepted: boolean): string | null {
  return accepted ? null : MESSAGES.termsEmpty;
}
