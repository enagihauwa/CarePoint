# Where validation lives: the server decides

Drafted by Claude at my request from the code and the evidence, so the wording is not all mine. Evidence: `evidence/11-validation-timing.txt`, `12-direct-request-before-and-after.txt`, `12b-server-checks-and-stored-values.txt`, `12c-regression-form-checks.txt`. Claude ran every test, on a throwaway database that was dropped afterwards.

## The rule

The browser checks for the patient's convenience. The **server** decides, because anyone can skip the form (`task-03-client-validation/docs/client-side-is-not-security.md`). Since Task 4 the server enforces every Task 3 rule on its own.

## How it is built

- **One set of rules, used twice.** The form and the server call the same functions in `src/lib/validation/auth.ts`, so they cannot drift apart. The server wraps them in Zod schemas in `src/lib/validation/schemas.ts` (register, login and reset).
- **Order inside `POST /api/register`:** read the body with a size limit, parse the JSON, run the schema, and only then use the **parsed** values. The raw request is never used after that (`src/app/api/register/route.ts`).
- **Size limit:** 4 KB. It comes from the field limits: name 100 + email 254 + phone 40 + password 64 = 458 characters, at most 4 bytes each in UTF-8 = 1,832 bytes, plus about 100 bytes of JSON, rounded up to 4 KB. A bigger body is refused with `413` before any rule runs.
- **`termsAccepted` must be exactly `true`.** The text `"true"` and `false` are both refused, so the record of agreement can be trusted.

## Normalisation

The server stores a trimmed name, a trimmed and **lowercased** email, and a phone number without spaces and hyphens. I checked what the database held (`12b`): `  Padded Name  ` became `Padded Name`, `  MixedCase@Example.COM ` became `mixedcase@example.com` and `0803 123-4567` became `08031234567`.

**Trim and lowercase are different jobs.** Trimming removes spaces that nobody meant to type, and lowercasing makes `Ada@x.com` and `ada@x.com` the same account, because the domain part is not case-sensitive in practice and a patient should not need to remember how they capitalised it.

## Passwords are not trimmed

The guide says passwords are "trimmed per the spec". My spec (Task 3, `docs/validation-rules.md`) says a password is **never trimmed**, because spaces inside and around a password are allowed. So I kept my rule. Trimming would also silently change what the patient typed, and then the same password typed at login would no longer match. I checked it on the server: `  abcdef` (8 characters counting the two spaces) is accepted, while ` abcdef` (7) is refused (`12b`, B2 and B3). If the server had trimmed, the first would have been 6 characters and refused.

## Error messages

- **Register** returns the same field-level messages as the form, under the names of the fields that failed. They reveal nothing secret.
- **Login and reset** return one generic message, "Check your details and try again.", for every bad request. Not an email, an empty password and a far-too-long password all get the same answer (`12b`, D1 to D3), so the response never says which half of a credential was wrong. A valid request gets an honest `501`, because there are no accounts yet.

## The password: checked, not stored, not logged

The form now sends the password so the server can check it. The server does **not** store it: the `Patient` table has no password column yet (`12b`, F). It is not logged either: the server writes only the method, path, status and time of each request, and searching the log for the test passwords found 0 matches (`12b`, G). Hashing (`scripts/hash-timing.js`, `docs/hashing.md`) will be added when the users table exists.

## What happened to the Task 3 attack

The same three raw requests that got `201` in Task 3 now get `400`, `400` and `413` (`12-direct-request-before-and-after.txt`). The form attack gives the same result as in Task 3, 10 sent and 9 blocked, because the server applies the same rules as the form (`12c`), and the browser checks still pass (43 of 43).

## Timing

The first request is slow in both runs (477 ms before, 436 ms after): a cold start, the same with and without validation. The rest vary a lot from run to run on this laptop with no code change, so ten requests cannot show a cost of a few microseconds. Timed on its own, validating a good request takes about **2.6 microseconds** and rejecting a bad one about **5.5** (`11`). The schemas are built once when the server loads. A rejected request is quick, because it stops before the database.

## Still accepted on purpose (not part of this step)

These are on the defects list and are not fixed here: the same email can register twice (needs the schema), `+0000000000` counts as an international number, markup in a name is stored as text, and the server still returns the patient `id`.
