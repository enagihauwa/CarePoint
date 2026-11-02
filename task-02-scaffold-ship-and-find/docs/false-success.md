# False success: the booking that looked fine but was never saved

Drafted by Claude at my request from my evidence files, so the wording is not all mine.

Evidence: `evidence/11a-false-success-get-request.txt` (the false success), `evidence/11-write-succeeded-logs.txt` and `evidence/12-database-rows.png` (real saves), `evidence/13-write-failed-logs.txt` and `evidence/13b-page-database-down.txt` (database deliberately broken).

## 1. What the user saw

I opened the booking form at `http://10.245.248.231:3000/book`, my laptop's network address, instead of `http://localhost:3000/book`. I filled in the form and pressed "Book appointment". The page seemed to reload. There was no success message and no error. Nothing on screen said that anything had gone wrong.

## 2. What actually happened

Nothing was saved. The `Booking` table had 0 rows afterwards.

On that network address, Next.js's development server blocked its own script files (the log says `Blocked cross-origin request to Next.js dev resource ... from "10.245.248.231"`). The form's JavaScript never ran, so the browser fell back to sending the form the old way: a `GET` request to `/book`, with every field in the address bar. The server simply sent the page again and answered `200`:

```
GET /book?name=[masked]&phone=[masked]&doctorId=3&date=2026-11-03&time=21%3A38 200 in 182ms
```

There is no `POST /api/bookings` line at all. The API, which is the only code that saves a booking, was never called. As a side effect, names and phone numbers ended up in the URL and in the server log, which I masked in the evidence file.

## 3. How a demo would fool a reviewer

In a demo, the reviewer watches the screen. They see someone fill in a neat form and press the button, the page responds, and no error appears. The server log shows only `200` responses, which look healthy at a glance. It is easy to assume the booking worked. Only the database tells the truth, and a reviewer usually does not open it.

## 4. The 30-second check that catches it

1. **Read the server log for the write.** A real booking produces `POST /api/bookings 201`. A `GET /book` with a `200` is just the page loading, not a booking.
2. **Look for the row.** Open Prisma Studio (or run a quick query) and check that a new `Booking` row exists, with its `id` and `createdAt`.

If either is missing, the booking did not happen, whatever the screen says.

## What I changed so it cannot happen silently again

- The form now uses `method="post"`, so personal details can never go into a URL or the log.
- The "Book appointment" button stays disabled until the form's script has loaded. If the script never loads, the page says "The booking form has not finished loading, so it cannot book yet" instead of reloading silently.
- The page only shows "Your booking is saved" when the API answers `201`.

I then booked again at `http://localhost:3000/book`. The log shows `POST /api/bookings 201` and the rows are in the database (`evidence/11`, `evidence/12`).

## When the database itself fails

I also broke the database connection on purpose by renaming `DATABASE_URL` in `.env`. Two `curl` bookings got `status=500` with "We could not save your booking. Nothing was booked.", and the log shows `POST /api/bookings 500`. Nothing was saved, and nothing claimed to be saved. The page showed "We can't load the list of doctors right now, so booking is unavailable."

One gap remains: that page still answered `GET /book 200` while showing an error. A check that looks only at status codes would think the page was healthy. That is in my defects list.
