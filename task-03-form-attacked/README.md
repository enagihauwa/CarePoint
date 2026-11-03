# Task 3: the form, attacked

Task 3 adds the patient account forms to CarePoint: sign up, log in and reset
password. It builds the form rules in the browser, then shows why those rules
are not a security boundary by attacking the form and the registration
endpoint. It also audits and fixes the accessibility of both the new sign-up
form and Task 2's booking form.

Drafted by Claude at my request from the files in this folder, so the wording
is not all mine.

## What this task contains

- **Account forms.** One route, `/auth`, shows sign up (`?mode=signup`), log in
  (`?mode=login`) or reset password (`?mode=reset`) without a page reload. Log
  in and reset validate their input but are not connected to an account system
  yet, and they say so.
- **Validation.** Empty-field, length and format rules for name, email, phone,
  password and terms, in `src/lib/validation/auth.ts`. The same rules serve all
  three forms.
- **Registration.** A `Patient` model, a migration, and `POST /api/register`,
  which deliberately has **no server-side validation** so the attack in
  `docs/client-side-is-not-security.md` can be shown.
- **Phone input.** A `type="tel"` text input instead of `type="number"`, with a
  demo page at `/demo/number-input` showing what a number input did to a
  Nigerian phone number.
- **Terms placeholder.** A `/terms` page with no legal wording. The terms
  checkbox works, but the text is pending a template and a lawyer.
- **Accessibility.** A field-by-field audit, my Narrator notes, automated checks
  before and after, and fixes to the booking form and sign-up form.
- **Attacks.** 19 attempts through the real sign-up form and three raw requests
  straight to the API, run by Claude at my request against a throwaway database.

## Documents

| Note | What it covers |
|---|---|
| [`docs/validation-rules.md`](docs/validation-rules.md) | Every rule, what breaks without it, and the legitimate user it wrongly blocks. |
| [`docs/field-justification.md`](docs/field-justification.md) | Why each registration field is kept, and why date of birth, gender and address were removed. |
| [`docs/number-vs-text-input.md`](docs/number-vs-text-input.md) | What `type="number"` did to `08031234567`, and why the phone field is text. |
| [`docs/spa-rationale.md`](docs/spa-rationale.md) | Why sign up, log in and reset share one route, what that costs, and when separate pages are better. |
| [`docs/enumeration.md`](docs/enumeration.md) | What the form shapes give away, including email enumeration and sequential ids. |
| [`docs/password-and-button.md`](docs/password-and-button.md) | The 8 to 64 password rule, a Show button instead of a confirm field, and why a hidden submit button was rejected for a disabled one with an explanation. |
| [`docs/rollback.md`](docs/rollback.md) | A regretted commit undone by its id with `git revert`, why not `reset --hard`, and what went wrong on the way. |
| [`docs/defects.md`](docs/defects.md) | Two defects fixed in this task and fifteen still open, each with a file, a line and the cost if it had shipped. |
| [`docs/client-side-is-not-security.md`](docs/client-side-is-not-security.md) | The two attacks, which rules the server enforced (none), and what moves to Task 4. |
| [`docs/accessibility-audit.md`](docs/accessibility-audit.md) | The five checks per field, the real problems found, the fixes, and my before/after Narrator notes. |
| [`docs/terms-note.md`](docs/terms-note.md) | Why no terms wording was written, and what must happen before the form is used with real patients. |

## Evidence

All files are in [`evidence/`](evidence/). The numbers match the order of the
work.

| Files | What they show |
|---|---|
| `01`–`02` | The page count before and after folding three auth pages into `/auth`. |
| `03`, `03a`–`03c` | The URL for the combined route and each mode. |
| `04` | Dev-server log: switching forms makes no request. |
| `05`–`08a` | Empty and length errors, real-time email checking on sign up, and submit-only checking on log in. |
| `09a`–`10` | `type="number"` losing the leading zero and changing the number on an arrow key, then the `tel` input working. |
| `13a`–`13c`, `14` | The rejected hidden-until-valid button (and the log showing its deleted experiment branch), then the kept disabled-until-valid button with its explanation. |
| `15`, `15b` | The 19 form attacks before and after fixing what the sign-up form sends. |
| `16` | Raw `curl` requests to `POST /api/register`, all accepted. |
| `17`, `17a` | The commit list with the regretted commit, the `git revert` that undid it, and the effect of the regretted change before it was undone. |
| `19` | The validation rules checked against valid and invalid values. |
| `20` | 43 automated browser checks of the three forms. |
| `21`–`22` | Automated accessibility checks before and after the fixes, plus a real booking after them. |

## How to run it

From the repo root, follow the [root README](../README.md#getting-started), then
run `npm run dev` and open:

- `http://localhost:3000/auth?mode=signup` for the sign-up form
- `http://localhost:3000/demo/number-input` for the phone input demo

The attack and accessibility scripts in `evidence/` need `playwright-core` and a
running production build. They were run by Claude on my machine, not by me.

## Status

**Built and checked**
- The `/auth` route and all three forms, with browser validation and honest "not
  available yet" messages on log in and reset.
- The `Patient` table and `POST /api/register`. A real submission saves a row.
- The phone field is text and keeps `+` and leading zeros.
- The terms checkbox is required and its placeholder page is linked.
- The sign-up button stays in the tab order (`aria-disabled`) and explains why
  when pressed too early. A hidden-button version was tried on its own branch,
  rejected and deleted.
- The booking form fixes: errors in live regions with icons, focus moved to the
  first problem, `aria-disabled` while saving, focus moved to the confirmation,
  and the terms link opening in a new tab.
- Automated checks: 43 browser checks pass and 0 accessibility problems remain
  in the 10 automated checks. These are not screen-reader tests.

**Open, or left for Task 4**
- **No server-side validation at all.** A raw request can save `a`, `a@b`, `abc`
  and an empty body, or a 200,000-character name. The server also returns the
  patient `id`, and duplicate emails are accepted.
- The form still sends trimmed name and email and a cleaned phone number, but
  the fixes stop at the form. A direct request can still store the untrimmed or
  dirty value.
- The sign-up form accepts `+0000000000`, and a name containing
  `<script>alert(1)</script>` is stored as text. Neither is fixed.
- Log in, password reset, password hashing and one-account-per-email do not
  exist. The password is not stored yet.
- The terms wording is not written and the `/terms` page must be replaced
  before real patients use the form.
- The Date and time field on the booking form is still five spin buttons. The
  hint reduces the confusion but does not solve it (A6 in the audit).
- My Narrator notes **after** the accessibility fixes are empty (`[ME]`
  sections). The automated "after" run is not a substitute for listening.
- Written: this task's defects list (`docs/defects.md`). Not written yet: its interview
  answers.
