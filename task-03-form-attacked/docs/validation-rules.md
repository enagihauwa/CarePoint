# Validation rules

Drafted by Claude at my request from my rough answers, so the wording is not all mine. The limits below (2 characters for a name, 8 to 64 for a password and so on) are product decisions for this assignment, not universal standards. The wording at the bottom is still to confirm.

Each rule says what breaks without it and which legitimate user it wrongly blocks.

## 1. Empty fields

Checked when the patient leaves the field (on blur). The message names the specific field. The empty-field wording is mine.

| Field | Message | What breaks without it | Legitimate user it wrongly blocks |
|---|---|---|---|
| Full name | Please enter your full name. | A patient with no name cannot be found at the front desk. | Nobody, the clinic needs a name. |
| Email address | Please enter your email address. | No reset link or notice can be sent. | A patient who has no email address cannot register. That is accepted for now, because the account is identified by email. |
| Phone number | Please enter your phone number so the front desk can reach you. | The clinic cannot call to confirm a visit. | A patient without their own phone. They would have to give a relative's number. |
| Password | Please create a password with at least 8 characters. | An account with no password protects nothing. | Nobody. |
| Terms | Please accept the terms before creating your account. | There is no record the patient agreed. | A patient who disagrees with the terms, who simply cannot create an account. |

## 2. Length and structure

Spaces at the start and end of a name or an email are removed before checking. A password is never trimmed.

| Field | Rule | What breaks without it | Legitimate user it wrongly blocks |
|---|---|---|---|
| Full name | 2 to 100 characters. Letters, spaces, hyphens and apostrophes are allowed, and so is anything else a real name can contain. It is not restricted to letters only. | One-letter junk such as `a` gets in. A very long value breaks layouts and fills the database with rubbish. | A person whose legal name is a single character (rare), or whose name is longer than 100 characters. |
| Phone number | After removing spaces and hyphens, either a Nigerian local number (11 digits starting with `0`, like `08031234567`) or an international number (`+` followed by 8 to 15 digits, like `+2348031234567`). 15 is the international maximum length of a phone number, and 8 is my own lower limit. | Letters and fragments such as `abc` or `0803` are saved, and the clinic calls a number that cannot work. | Someone whose Nigerian number does not follow the 11-digit mobile pattern, for example some landline numbers, and someone abroad whose number has fewer than 8 or more than 15 digits. A patient abroad is allowed only because the international form is accepted. |
| Email address | One `@`, something before it, and a domain with at least one dot after it, with no spaces. Characters such as `+` are allowed (`patient+care@example.com`). | A typo such as `john@` or `john.example.com` is saved, and the patient never gets a reset link. | An address on an internal host with no dot (`name@localhost`), which no real patient has. |
| Password | 8 to 64 characters. Spaces inside are allowed. A password made only of spaces is rejected. Nothing is trimmed. The maximum stops an enormous password from being sent for the server to hash (Task 4). | One- and two-character passwords can be guessed immediately. Without a maximum, a huge value makes the server do a lot of work. | A patient who prefers a short, memorable password, a slow typist on a phone for whom 8 characters is a burden, and someone who uses a passphrase longer than 64 characters. A password made only of spaces blocks nobody who is real. |

## 3. When the format is checked

- **Sign-up:** the email format is checked **in real time**, as the patient types, so a typo is caught while they can still fix it.
- **Login:** the email format is checked **only on submit**. A patient typing a known address does not need warnings mid-word, and a login form should not tell a stranger anything about which addresses are valid or registered.

### Why checking that an email address exists is pointless

Ownership is proved by a code or link sent to that address later, and a check that the address exists cannot prove the patient owns it. A live "does this address exist" check would also tell an attacker which addresses already have accounts.

## 4. Accessible errors

Covered in the accessibility audit (`docs/accessibility-audit.md`, not written yet).

## Wording I drafted (to confirm)

The length and format messages below are not from my own rough answers. I should reword them if they do not sound like the clinic.

- Name too short or long: "Your name should be between 2 and 100 characters."
- Phone not valid: "Enter a Nigerian number like 08031234567, or an international number starting with +."
- Email not valid: "Enter an email address like name@example.com."
- Password too short: "Your password needs at least 8 characters."
- Password too long: "Your password can be at most 64 characters."
- Password only spaces: "Your password can't be only spaces."
