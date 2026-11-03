# Client-side validation is not security

Drafted by Claude at my request. Claude also **ran both attacks** for me on 3 November 2026, because I asked it to. The guide says this step is meant to be done by me, so the evidence files say plainly that Claude ran them. The attacks used a production build of the app and a throwaway database that was dropped afterwards. My real database was not touched. The wording below is not all mine.

Evidence: `evidence/15-form-attack-results.txt` (through the form), `evidence/16-direct-request-command-and-response.txt` (straight to the endpoint).

## Attack 1: through the form

19 attempts in the real sign-up form, each with otherwise valid values. **9 were blocked** by the form's rules (a one-letter name, a name of only spaces, a 101-character name, `a@b`, letters as a phone number, a password of only spaces, a 7-character password, a 65-character password, and terms not ticked). **10 were let through** and the server saved them.

Four of the ten things that got through are not what my rules intended:

- **A padded name was saved with its spaces.** I typed `  Padded Name  ` and the database holds `[  Padded Name  ]` (15 characters). The form checks the trimmed name but sends the untrimmed one.
- **A phone number was saved exactly as typed.** `0803 123-4567` went in with its space and hyphen, although my rules say these are removed before checking. The form validates the cleaned number but sends the raw one, so the same number could be stored two ways.
- **The same email was accepted twice** (`dup@example.com`, rows 6 and 7). Nothing enforces one account per email yet.
- **`+0000000000` was accepted as an international number.** It has the right shape but is not a real number.

Two more worth noting:
- A name of `<script>alert(1)</script>` was saved as plain text. The page shows it safely, because React escapes it, but it sits in the database. Any later place that prints names without escaping (an admin page or an email) could run it.
- A trailing space on an email did not get saved, because the browser's email input strips it before the form sees it.

### Fixed afterwards

The first two findings (the padded name and the phone number stored as typed) were bugs in my own form, so I fixed them straight away. The form now sends the trimmed name and email and the phone number without spaces and hyphens. I reran the same attacks (`evidence/15b-form-attack-after-fix.txt`): the padded name is stored as `[Padded Name]` (11 characters) and `0803 123-4567` is stored as `08031234567`. The other findings (duplicate email, `+0000000000`, the markup in a name) are not fixed yet and are on the Task 4 list below. The original results stay in `evidence/15-form-attack-results.txt` as the "before".

## Attack 2: around the form

I sent this straight to the endpoint with `curl`, with no form and no browser (the guide's example, adapted to CarePoint's fields):

```
curl -i -X POST http://localhost:3077/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"a","email":"a@b","phone":"abc","password":"   "}'
```

**The server accepted it.** It answered `HTTP/1.1 201 Created` and saved the row: name `a`, email `a@b`, phone `abc`. Two more raw requests were accepted as well: an **empty body** `{}` (it saved a row of empty strings) and a **200,000-character name** (all 200,000 characters were stored).

## Which of my rules were enforced by the server

None.

| Rule | Enforced by the server? |
|---|---|
| Name 2 to 100 characters | No (a 1-character, an empty and a 200,000-character name were all saved) |
| Phone is a Nigerian number or `+` and 8 to 15 digits | No (`abc` and an empty phone were saved) |
| Email has an `@` and a dotted domain | No (`a@b` and an empty email were saved) |
| Password 8 to 64 characters, not only spaces | No. The password is never read, because it is not stored yet. |
| Terms accepted | Not checked. The server records the time only if the browser said `true`. |

## What this proves

The rules I built in the browser protect the honest patient from their own typing mistakes. They do not protect the clinic from anyone who skips the form, because the browser is under the sender's control. Anyone can send the same request with `curl`, a script or a browser's developer tools. The form is a convenience, not a security boundary.

## What I will do in Task 4

- Check every field on the **server**, with the same rules as the form, and answer `400` with a clear message when a rule fails. Reuse the rules in `src/lib/validation/auth.ts` so the form and the server cannot drift apart.
- **Trim and normalise on the server**: trim names and emails, and store phone numbers in one form.
- Limit the size of the request body, so a 200,000-character name is refused.
- Enforce one account per email, without telling a stranger which emails are registered (`docs/enumeration.md`).
- Reject nonsense international numbers such as `+0000000000`, and decide how to treat names that contain markup.
- Stop returning the patient `id` in the response.
