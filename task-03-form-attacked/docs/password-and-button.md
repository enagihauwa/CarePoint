# Password rules and the submit button

Drafted by Claude at my request from my earlier answers and my screenshots, so the wording is not all mine. Evidence: `evidence/13a-hidden-button-gone.png`, `13b-hidden-button-valid.png`, `13c-git-log-before-delete.txt` and `14-disabled-until-valid-button.png`.

## Minimum length: 8 characters, maximum 64

I chose 8 because it gives patients reasonable flexibility without making registration unnecessarily difficult on a phone. A longer minimum is stronger, but many of my patients type on small screens, and some are unwell or worried when they use the app. This is a product decision for this assignment, not a universal standard. The maximum of 64 stops an enormous password from being sent for the server to hash later (Task 4). Spaces inside a password are allowed, so a patient can use a passphrase, but a password of only spaces is refused. The password is never trimmed.

## The rules appear only after typing starts

The line "Use 8 to 64 characters. Spaces are allowed, but not only spaces." is not shown on an empty password box. It appears when the patient types the first character, and it is linked to the field with `aria-describedby`, so a screen reader reads it with the field. An empty form stays calm, and the rule is there at the moment the patient needs it.

## Show and hide button, not a confirm field

I used a **Show / Hide** button beside the password box and not a second "confirm password" box. A confirm box catches typing mistakes, but it doubles the typing on a phone, and a patient may then paste the same mistake twice. A show button lets the patient check what they typed, once. The button's accessible name changes between "Show password" and "Hide password".

## The submit button: hidden or disabled

I tried both on the sign-up form.

**Hidden until valid (experiment, rejected).** The Create account button was not in the page until every field was valid (`13a`, `13b`). In `13a` the form has the terms unticked, an error message is showing, and there is **no button at all**, just empty space. A keyboard or screen-reader user has nothing to press and nothing says what is missing, and the button appears and disappears as the patient types. The experiment lived on its own branch, was never merged, and was deleted (`13c`).

**Disabled until valid, with an explanation (kept).** The button is always there, grey while the form is not ready (`14`). It uses `aria-disabled`, not the `disabled` attribute, so it stays in the tab order and a keyboard or screen-reader user can still reach it. Pressing it while the form is not ready explains why ("Please accept the terms before creating your account.", with a caution icon), and moves focus to the first problem. This is the version in the app.

## What this does not prove

I checked the kept version with automated browser checks (`evidence/20-claude-browser-behaviour-test.txt`), not yet with a screen reader. I have not listened to the sign-up form with Narrator.
