# Why sign up, log in and reset are one route

Drafted by Claude at my request from my evidence and my decision, so the wording is not all mine. Evidence: `evidence/01-page-count-before.txt`, `02-page-count-after.txt`, `03-url-states.png` and `04-form-switch-logs.txt`.

## What I did

Sign up, log in and reset first existed as three separate pages (`/signup`, `/login`, `/reset`). I then collapsed them into one route, `/auth`, which shows one of the three forms depending on `?mode=signup|login|reset`. The page count went from six to four (`/`, `/book`, `/terms` and `/auth`), not counting the API routes.

Switching between the forms changes the address bar and swaps the form without a page reload. The links use `pushState`, and I checked that each link also has a real `href`, so opening one in a new tab still works.

## Why one route suits CarePoint

- **It costs the server nothing.** My dev server log (`evidence/04-form-switch-logs.txt`) shows five page loads from my own refreshes and **no request at all** for switching from sign up to log in to reset. A patient on a weak mobile connection does not wait for a new page each time they change their mind.
- **The three forms are small and closely related.** They share the same header, card, field styles and error behaviour, so one set of components serves all three.
- **The address still tells the truth.** Each mode has its own address (`mode=signup`, `mode=login`, `mode=reset`), the browser's Back button returns to the previous form, and the page title changes with the mode.

## What it costs

- **Typed values are lost when the patient switches forms.** I tested it: I typed a name and phone number into the sign-up form, switched to log in and back, and the form was empty. Each form is built fresh when it appears. I decided to **accept** this and not fix it. The password in particular should not stay in memory while a different form is on screen, and keeping only the other fields would add code for a rare case, because the sign-up form has only four fields.
- **The three forms share one path.** Anything that works by path (some analytics and some access rules) cannot tell them apart without also reading `?mode=`.
- **A reset or login page cannot be protected or tracked on its own** without extra code.

## One case where separate pages are better

A **front-desk or admin area** later on. It has different users, different rules and a different layout, so it needs its own address, its own page title and its own protection (for example, sending a patient away from it). Folding that into a `mode` on a shared route would mix two kinds of user on one page. A signed-in patient's bookings page is the same: it should not be reachable as a mode of the public sign-in form.
