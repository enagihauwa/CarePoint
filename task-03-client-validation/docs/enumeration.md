# Not leaking sensitive shape

Drafted by Claude at my request, from reading the forms and the two APIs on 3 November 2026, so the wording is not all mine. The trade-offs are Claude's suggestions for me to accept or change. Login and password reset are **not connected yet**, so their rows describe what I intend, not something that exists.

## What I checked

- No input has a `placeholder` attribute, so no field shows a sample value inside the box.
- The only hints under fields are the phone hint ("We'll call this number to confirm your visit", which says why, not what the format is) and the password hint (see below).
- No message anywhere says whether an account exists, because there is no account lookup yet and the sign-up API does not reject duplicates.

## The fields and what their shape gives away

| What | Why its shape matters | What an attacker gains | Trade-off I accept | Status |
|---|---|---|---|---|
| **Whether an email is registered** (login, reset and sign-up responses) | An email address that has a CarePoint account tells the world that a named person is probably a patient of this clinic. That is health-related information about them. | Can check a list of people against the clinic, then send them targeted scam messages. This is called user enumeration. | The messages become vaguer for honest patients: login will say "Email or password is incorrect" without saying which, and reset will say "If that email is registered, we have sent a link". A patient who mistyped their email gets no hint that the email was the wrong part. | **Not built yet.** Today nothing leaks, because there is no lookup. In Task 4, sign-up with an existing email must answer the same way as a new one, and the responses should also take about the same time. |
| **Password length rule** (8 to 64) | Knowing the minimum and maximum shrinks what an attacker has to try. | Very little. Most sites publish this. | I show the rule on **sign-up only**, and only after the patient starts typing. The login form never mentions it (its only message is "Please enter your password."). | **Done** (`SignupForm.tsx:120`, `LoginForm.tsx`) |
| **Phone and email format examples** in error messages (`08031234567`, `name@example.com`) | They show what a valid value looks like. | Nothing useful. Nigerian number formats are public, and the examples are invented, not real numbers. | None needed. | **Done**, no change |
| **Sequential ids in API answers.** Both `POST /api/register` and `POST /api/bookings` return `id: 1, 2, 3…`, and the booking number on the confirmation screen is that id. | A running number reveals how many patients and bookings there are, and makes the next one easy to guess. | Learn how busy the clinic is. If a later page fetches a booking or patient by id without checking who is asking, an attacker could simply count upwards. | Keeping a short booking number is useful: a patient can read it out at the front desk. I accept that for the booking number, but not for the patient id, which the browser does not need. | **Open.** To fix in Task 4: stop returning the patient id, and check who is asking before showing anything found by id (`src/app/api/register/route.ts:30`, `src/app/api/bookings/route.ts:45`). |

## What does not exist yet

The clinic has no patient card number or any other identifier with a fixed format. If one is added later, its format must not appear in a placeholder, a hint or an error message.
