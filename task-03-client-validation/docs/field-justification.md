# Field justification: patient registration

Drafted by Claude at my request from my rough answers, so the wording is not all mine. The third column ("What happens if it is wrong") is Claude's draft and I should correct it against how the clinic would really work.

A field stays only if the clinic can say why it needs it, what it does with it, and what goes wrong if it is wrong. A field that fails all three is removed.

## Fields kept

| Field | Why CarePoint needs it | What the clinic does with it | What happens if it is wrong |
|---|---|---|---|
| Full name | To identify the patient on appointment records. | Shown on the booking and on the front-desk list. | The patient cannot be found at the front desk, or the record carries the wrong name. |
| Email address | To create the account, support login and password recovery, and send booking notifications. | The account is identified by it. It is where a reset link and, later, booking and lab-result notices are sent. | The patient never gets a reset link or a notice. If it is someone else's address, that person receives a patient's booking details. |
| Phone number | So the front desk can contact the patient about an appointment. | The front desk calls to confirm the visit, as the booking form already says. | The clinic cannot reach the patient. A wrong number may reach a stranger. |
| Password | To let the patient create an account, log in and see their bookings. | Never read by staff. Checked at login. It will be stored only as a hash (Task 4). | A weak or guessed password lets someone else see a patient's bookings and personal details. |
| Terms acceptance | To record that the patient agreed to the applicable terms before creating an account. | Acceptance and the time it happened are stored with the account. | Without a record, the clinic cannot show that the patient agreed. |

## Fields removed

| Field | Why it was removed |
|---|---|
| Date of birth | No confirmed feature in the app needs it, and the clinic cannot name an operational reason to collect it at registration. |
| Gender | No established clinic process needs it at registration. |
| Address | Booking an appointment does not need a residential address. |

These fail all three tests (why needed, what the clinic does with it, what happens if wrong), so they are not collected. They should only be added if the clinic can give a real reason for each one. Collecting less personal information also means less to protect if something leaks.

## What is intended, not built

Some uses above are planned and do **not** exist yet. Today there is no login, no password reset and no email or notification sending.
- Password reset and login: planned for the account work in Task 4.
- Booking and lab-result notifications by email: planned. The email settings in `.env.example` (`SMTP_*`) are not used yet.
