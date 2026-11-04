// Server-side validation (Task 4, steps 6 and 7). The browser form and the API use the SAME
// rule functions from ./auth.ts, so the two cannot drift apart. The form checks for the
// patient's convenience. These schemas are the ones that decide, because anyone can skip the form.
import { z } from "zod";
import { MESSAGES, normalizePhone, validateEmail, validateName, validatePassword, validatePhone } from "./auth";

// Size limits that are not patient-facing rules. They stop absurd input before the rules run.
// The request body limit is derived from the field limits: name 100 + email 254 + phone 40 +
// password 64 = 458 characters, at most 4 bytes each in UTF-8 = 1,832 bytes, plus about 100
// bytes of JSON punctuation and key names, rounded up to 4 KB.
export const SERVER_LIMITS = {
  bodyBytes: 4096,
  emailChars: 254, // the longest an email address can be
  phoneRawChars: 40, // 15 digits and a +, with room for spaces and hyphens
} as const;

const rule = (check: (value: string) => string | null) => (value: string, ctx: z.RefinementCtx) => {
  const message = check(value);
  if (message) ctx.addIssue({ code: "custom", message });
};

// A missing or non-text value gets the same message as an empty field, not Zod's own wording.
const name = z
  .string({ error: MESSAGES.nameEmpty })
  .superRefine(rule(validateName))
  .transform((value) => value.trim());

const email = z
  .string({ error: MESSAGES.emailEmpty })
  .max(SERVER_LIMITS.emailChars, MESSAGES.emailFormat)
  .superRefine(rule(validateEmail))
  .transform((value) => value.trim().toLowerCase());

const phone = z
  .string({ error: MESSAGES.phoneEmpty })
  .max(SERVER_LIMITS.phoneRawChars, MESSAGES.phoneFormat)
  .superRefine(rule(validatePhone))
  .transform(normalizePhone);

// A password is checked exactly as typed and is NEVER trimmed or lowercased: spaces are allowed
// in a password, and changing what the patient typed would break their login later.
const password = z.string({ error: MESSAGES.passwordEmpty }).superRefine(rule(validatePassword));

export const RegisterSchema = z.object({
  name,
  email,
  phone,
  password,
  termsAccepted: z.literal(true, { error: MESSAGES.termsEmpty }),
});

// Login and reset answer with ONE generic message, so they never say which half of a credential
// was wrong. The details of why are not needed here, only whether the shape is acceptable.
const loginEmail = z
  .string()
  .max(SERVER_LIMITS.emailChars)
  .superRefine(rule(validateEmail))
  .transform((value) => value.trim().toLowerCase());

export const LoginSchema = z.object({
  email: loginEmail,
  // A stored password can never be longer than the register limit, so anything longer is wrong.
  password: z.string().min(1).max(64),
});

export const ResetSchema = z.object({ email: loginEmail });

// The code is exactly six digits. Anything else is refused before the database is touched.
export const VerifySchema = z.object({ email: loginEmail, code: z.string().regex(/^\d{6}$/) });
export const ResendSchema = z.object({ email: loginEmail });

export const GENERIC_BAD_REQUEST = "Check your details and try again.";

// The first message for each field, in the shape { field: ["message"] }.
export function fieldMessages(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
