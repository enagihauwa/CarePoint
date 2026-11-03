# Database schema (paper first)

Drafted by Claude at my request from my hand drawing (`evidence/01-schema-drawing.jpg`, first version `01a`) and my decisions, so the wording is not all mine. Nothing here is built yet. The drawing shows only key columns, and this document lists **every** column.

## Names

The real database uses singular PascalCase names, like the tables I already have (`Doctor`, `Booking`, `Patient`). My drawing used plural names, and the guide's wording differs again, so:

| Drawing and guide | Prisma model |
|---|---|
| users | `User` |
| patients | `Patient` (profile of a `User`) |
| sessions | `Session` |
| doctors | `Doctor` |
| bookings | `Booking` |
| payments | `Payment` |
| payment_attempts (my "payment events") | `PaymentEvent` |
| knowledge chunks, retrieval | **not built.** My fifth table is `Service` (see below). |
| (needed for step 10) | `EmailVerification` |

**The retrieval table.** The guide asks for a table of text chunks for retrieval. CarePoint has no retrieval or question-answering feature, and I did not want to invent one to justify a table. My fifth table is `Service`, the price list for consultations and lab tests, which answers one of the clinic's three repeated questions ("how much does it cost?"). It is **not** a retrieval table, and I say so on purpose. I have not yet confirmed with my lecturer that this is acceptable.

pg-boss, the background job library, creates and manages its own tables in a separate schema when it first runs. They are not part of this design.

## The tables, every column

Types are PostgreSQL types as Prisma writes them. **?** means it can be empty.

### User
One row per person who can log in: a patient or a front-desk member of staff.

| Column | Type | ? | Notes |
|---|---|---|---|
| id | integer, primary key | | |
| email | text, **unique** | | Stored trimmed and lowercased. |
| passwordHash | text | | Argon2id hash. The password itself is never stored. |
| name | text | | On the user, not the profile, so staff have one too. |
| role | `patient` or `admin` | | Default `patient`. |
| emailVerifiedAt | timestamp | ? | Empty until the patient enters the 6-digit code (step 10). |
| createdAt | timestamp | | Default now. |

### Patient (profile)
| Column | Type | ? | Notes |
|---|---|---|---|
| id | integer, primary key | | |
| userId | integer, **unique**, foreign key to User | | One profile per user. |
| phone | text | | Stored without spaces or hyphens. |
| termsAcceptedAt | timestamp | | Required: the server refuses a registration unless the terms were accepted. |
| createdAt | timestamp | | |

### Session
| Column | Type | ? | Notes |
|---|---|---|---|
| id | integer, primary key | | |
| userId | integer, foreign key to User | | |
| tokenHash | text, **unique** | | Only a **hash** of the session token is stored. |
| createdAt | timestamp | | |
| expiresAt | timestamp | | |
| revokedAt | timestamp | ? | Set when the user logs out or the session is cancelled. |

No IP address or browser string is stored: I decided against keeping that personal data.

### Doctor (exists)
| Column | Type | ? | Notes |
|---|---|---|---|
| id | integer, primary key | | |
| name | text, **unique** | | |
| specialty | text | | |
| createdAt | timestamp | | New. Added with a default of now, so the 5 existing rows get a value. |

### Booking (exists, changes)
| Column | Type | ? | Notes |
|---|---|---|---|
| id | integer, primary key | | |
| patientId | integer, foreign key to Patient | | **New and required.** The table has 1 row today, so adding it fails until the three-step migration (step 3). |
| doctorId | integer, foreign key to Doctor | | Exists. |
| date | date | | Exists. |
| time | text | | Exists, written like `09:30`. |
| createdAt | timestamp | | Exists. |

The existing `name` and `phone` columns on `Booking` are **removed**. A booking now says who it is for through `patientId`, and I do not keep a second copy of the patient's name and phone (see "Duplicated facts").

### Payment
Payments are recorded by front-desk staff. There is no payment gateway, so a payment is `pending` or `paid`.

| Column | Type | ? | Notes |
|---|---|---|---|
| id | integer, primary key | | |
| reference | text, **unique** | | A readable reference, used to find the payment later. |
| bookingId | integer, foreign key to Booking | | |
| amountKobo | integer | | Whole kobo (100 kobo = 1 naira), never a decimal. An integer holds up to about 21 million naira. |
| status | `pending` or `paid` | | Default `pending`. |
| method | `cash`, `transfer` or `pos` | ? | Empty until paid. |
| paidAt | timestamp | ? | Empty until paid. |
| recordedById | integer, foreign key to User | | The staff member who recorded it. |
| createdAt | timestamp | | |

### PaymentEvent (my "payment attempts")
A history that is only ever **added to**: a row is never changed or deleted.

| Column | Type | ? | Notes |
|---|---|---|---|
| id | integer, primary key | | |
| paymentId | integer, foreign key to Payment | | |
| oldStatus | `pending` or `paid` | ? | Empty for the first event. |
| newStatus | `pending` or `paid` | | |
| amountKobo | integer | | The amount at that moment. |
| method | `cash`, `transfer` or `pos` | ? | |
| recordedById | integer, foreign key to User | | Who made this change. |
| note | text | ? | |
| createdAt | timestamp | | When. |

### Service (price list)
| Column | Type | ? | Notes |
|---|---|---|---|
| id | integer, primary key | | |
| name | text, **unique** | | |
| kind | `consultation` or `lab_test` | | |
| priceKobo | integer | | Whole kobo. |
| active | boolean | | Default true, so an old service can be retired without deleting it. |
| createdAt | timestamp | | |

### EmailVerification
| Column | Type | ? | Notes |
|---|---|---|---|
| id | integer, primary key | | |
| userId | integer, foreign key to User | | |
| codeHash | text | | Only a **hash** of the 6-digit code is stored. |
| expiresAt | timestamp | | |
| attempts | integer | | Default 0. Counts wrong tries. |
| usedAt | timestamp | ? | Set when the code is used, so it cannot be reused. |
| createdAt | timestamp | | |

## Relationships

| From | To | Kind | Meaning |
|---|---|---|---|
| User | Patient | 1 to 1 | A patient user has one profile. Staff have none. |
| User | Session | 1 to many | One person can be logged in on several devices. |
| User | EmailVerification | 1 to many | A new code can be sent. |
| Patient | Booking | 1 to many | One patient has many bookings. |
| Doctor | Booking | 1 to many | |
| Booking | Payment | 1 to many | Normally one payment, but a booking could be paid in parts. |
| Payment | PaymentEvent | 1 to many | The history of that payment. |
| User (staff) | Payment, PaymentEvent | 1 to many | "Recorded by". |

There are no many-to-many relationships. `Service` is not linked to anything yet, because a booking does not record which service was chosen. That is a gap, listed under "Not decided".

## Indexes, why each, and what it costs

Every index makes a lookup fast, and costs **an extra write on every insert or update of that table, plus storage**. I only index what is looked up often.

| Index | Why | Write cost |
|---|---|---|
| `User.email` unique | Find an account at login, and refuse a second account for one email. | Checked on every registration. |
| `Patient.userId` unique | Enforces one profile per user and finds the profile of a user. | One extra index write per registration. |
| `Session.tokenHash` unique | Look up the session on every request. | One extra write per login. |
| `Session.userId` | List or cancel all of one user's sessions. | Small. |
| `Session.expiresAt` | The scheduled job that clears expired sessions. | Small. |
| `Booking (doctorId, date, time)` unique | **Stops two patients booking the same doctor at the same time** (my Task 2 defect). | Checked on every booking, which is what I want. |
| `Booking.patientId` | Show a patient their own bookings. | Small. |
| `Payment.reference` unique | Find one payment by its reference, even 14 months later. | Small, one write per payment. |
| `Payment.bookingId` | Find the payments for a booking. | Small. |
| `PaymentEvent (paymentId, createdAt)` | Show a payment's history in order. | One write per change, which is rare. |
| `EmailVerification (userId, expiresAt)` | Find a user's latest code, and clear expired ones. | Small. |
| `Service.name` unique | No two services with one name. | Small. |

## Duplicated facts, and why

- **`Payment.amountKobo` and `PaymentEvent.amountKobo`.** Each event keeps the amount at that moment, so the history stays true even if the payment is corrected later.
- **`Payment.status` and the newest `PaymentEvent.newStatus`.** The current status is on the payment for fast reading. The events are the record of how it got there.
- **`Service.priceKobo` and `Payment.amountKobo`.** The price list can change, but a payment must keep the amount that was actually charged.
- **Not duplicated, on purpose:** `Booking` does **not** keep its own copy of the patient's name and phone. One source of truth means a patient's phone number cannot disagree between two tables. The cost is that if a patient later changes their phone, old bookings show the new one.

## A payment from 14 months ago

If a tax authority asked about a payment from 14 months ago, I would find it by its **reference**, which is indexed and unique. The `Payment` row gives the amount, the status, the method, when it was paid and who recorded it, and its booking and patient follow through the links. The `PaymentEvent` rows show every change to it, who made each one and when, because they are never changed or deleted. So the payment records are **retained**, found by reference, and the history ties back to them.

**A conflict I have not resolved:** keeping payment records conflicts with deleting a patient's personal data. That decision belongs to Task 5 (compliance). It will probably mean keeping the payment and its reference but removing or anonymising the patient's name and phone.

## Not decided or not done

- **Which service a booking is for.** `Booking` does not link to `Service` yet.
- **What happens to related rows when a user is deleted** (the delete rules on the links). Task 5.
- **Whether `PaymentEvent` is made append-only by the database** (removing the right to change or delete it), or only by the application.
- **Admin accounts** are created by a seed script, not by the sign-up form. Only patients register.
- **My lecturer's answer** on the missing retrieval table.
- **The drawing needs a retake**, with the whole sheet in the frame, a handwritten date, the unique-slot note and the "recorded by" line.
