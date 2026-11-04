# Defects found in Task 3

Drafted by Claude at my request. Every item was checked against the files on 3 November 2026, and the line numbers are from the files as they stood then. Task 1 and Task 2 defects are in their own `docs/defects.md` files.

## Fixed during Task 3

| # | Defect | Where it was | What fixed it | Production cost if it had shipped |
|---|---|---|---|---|
| F1 | **The sign-up form sent what it had not validated.** It checked the trimmed name and the cleaned phone number but sent the raw ones, so `  Padded Name  ` and `0803 123-4567` were stored as typed. | `src/components/auth/SignupForm.tsx` (the request body) | The form now sends the trimmed name and email and the phone without spaces and hyphens (`b6bbdbb`). Evidence: `evidence/15`, `15b`. | The same phone number stored in several ways, so a front-desk search for it misses patients. |
| F2 | **Seven accessibility problems on the unfixed forms:** field errors not announced, errors shown by colour only, focus not moved after a failed submit, focus dropped while saving, no focus on the confirmation, an alert on the page's first load, and a terms link that lost the form. | `src/app/book/BookingForm.tsx`, `src/components/auth/fields.tsx` | Fixed in `d341d91`. Evidence: `evidence/21`, `22`, `docs/accessibility-audit.md`. | A blind or keyboard-only patient could not tell what was wrong with a booking, and some could not finish one. |

## Open

| # | Defect | Where | Production cost |
|---|---|---|---|
| O1 | **The server validates nothing.** A raw request saved `a`, `a@b`, `abc`, an empty body and a 200,000-character name, and answered `201`. | `src/app/api/register/route.ts:8` and `:24-27` | Anyone can skip the form and fill the database with junk, or make it huge. This is the point of Task 4. Evidence: `evidence/16`. |
| O2 | **The same email can register twice.** Nothing is unique on `email`. | `prisma/schema.prisma:24` (the `Patient` model starts at `:21`) | Two accounts for one patient, so a reset or a notice goes to the wrong one. Fixing it must not tell a stranger which emails are registered (`docs/enumeration.md`). |
| O3 | **`+0000000000` counts as a valid international number.** The rule only checks `+` and 8 to 15 digits. | `src/lib/validation/auth.ts:46` | The front desk calls a number that cannot exist. |
| O4 | **A name with markup is stored as plain text** (`<script>alert(1)</script>` was saved). The page shows it safely, because React escapes it, but it is in the database. | `src/app/api/register/route.ts:24` | Any later place that prints names without escaping, such as an admin page or an email, could run it. |
| O5 | **The server returns the patient `id`** and the browser does not need it. Ids are sequential, so they reveal how many patients there are and are easy to guess. | `src/app/api/register/route.ts:30` | Competitors can read the clinic's size, and a later page that fetches by id without checking who is asking could be walked one id at a time. |
| O6 | **The server believes the browser about the terms.** `termsAcceptedAt` is set whenever the request says `"termsAccepted": true`, whether or not anything was ticked. | `src/app/api/register/route.ts:27` | The clinic could not rely on its record that a patient agreed. |
| O7 | **Log in and reset do not exist.** Both forms validate and then say "not available yet", and the password is never stored or hashed. | `src/components/auth/LoginForm.tsx:61`, `src/components/auth/ResetForm.tsx:46`, `prisma/schema.prisma:21` | A patient can register but never log in. Planned for Task 4. |
| O8 | **The terms and privacy page is a placeholder with no legal wording.** | `src/app/terms/page.tsx:17` | The checkbox claims agreement to terms that do not exist. It must be replaced from a template and lawyer-checked before any real patient uses the form (`docs/terms-note.md`). |
| O9 | **Date and time is read as five spin buttons by Narrator** (day, month, year, hours, minutes, with a year up to 275760). A hint reduces the confusion but does not solve it. | `src/app/book/BookingForm.tsx:151` | A blind patient has to set five numbers to choose a time. The real fix is to pick from a list of available slots. |
| O10 | **A risk, not confirmed:** the booking page's first HTML contains a "has not finished loading" message. It is plain text now, not an alert, and Narrator did not read it in my run. | `src/app/book/BookingForm.tsx:168` | A patient on a slow connection sees an error-looking message while the page loads. |
| O11 | **The demo page is still in the app.** `/demo/number-input` is hidden from search results and not linked, but anyone who knows the address can open it. | `src/app/demo/number-input/page.tsx` | A page that is not part of the product, in a deployed site. Delete it before deploying. |
| O12 | **Switching forms throws away what was typed.** This is a trade-off I accepted, so the password is not kept in memory while another form is on screen. | `src/components/auth/AuthSwitcher.tsx:34-36` (`key={mode}`) | A patient who clicks Log in halfway through sign-up starts again (`docs/spa-rationale.md`). |
| O13 | **My "after" Narrator notes do not exist yet.** The automated "after" run found 0 problems, but it is not a screen reader. The sign-up form has also never been listened to. | `docs/accessibility-audit.md` | I cannot say the fixes work for a real blind patient until I have listened. |
| O14 | **The attack and accessibility scripts are not repeatable from the repo.** They need `playwright-core`, which is not in `package.json`, and they were run by Claude, not by me. | `evidence/15-form-attack-script.js`, `20-behaviour-test-script.js`, `21-accessibility-checks-script.js` | Someone cloning the repo cannot rerun the evidence without installing a package that the README does not mention (the Task 3 README does say so). |
| O15 | **A name's length is counted in JavaScript's 16-bit units,** so a name with characters outside the basic range can count as two. | `src/lib/validation/auth.ts:33` | A rare name may be refused below 100 visible characters. Low impact. |

## Checked and not a defect

- The browser rules do what they promise: 9 of 19 bad inputs were blocked, with the right message (`evidence/15`).
- Log in and reset never claim success. They say "not available yet" (`LoginForm.tsx:61`).
- No input uses a `placeholder`, so no field shows a sample value (`docs/enumeration.md`).
- The password is never sent to the server or stored, so there is no plaintext password in the database.
- All 43 browser checks of the three forms pass (`evidence/20`).
