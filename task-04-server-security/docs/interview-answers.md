# Task 4 interview answers

Batch 1 (questions 1 to 5), pasted by me. The questions were suggested by Claude, because the Task 4 guide lists none.

## 1. Why did you need server-side validation when the form was already checking the fields? What did the raw request test show?

I realised that checking the form in the browser alone wasn't enough. Someone could bypass the form completely and send a request directly to the server. So, the server also needed to check whatever data it received.

In Task 3, Claude tested this by sending three direct requests to the registration API. All three returned `201`, even though they included invalid data. One was an empty request, and another had a name that was 200,000 characters long.

After adding server-side validation in Task 4, those same requests were tested again. This time, they returned `400`, `400` and `413`. This showed that the server was now rejecting invalid and oversized requests.

## 2. What did your password hashing test show about Argon2id?

From my test, Argon2id took 77.29 milliseconds to hash a password. That works out to about 12.9 guesses per second on the test machine.

I also compared it with SHA-256, which took just 0.00346 milliseconds and could perform about 288,775 guesses per second in that test.

The difference made me understand why we shouldn't use a fast hash like SHA-256 for storing passwords. Argon2id deliberately takes longer, making it much harder for someone to try large numbers of passwords quickly.

Claude ran the timing test and recorded the results. The figures are from the test machine, so they don't necessarily represent the speed an attacker would get with different hardware.

## 3. Why did you choose a 4 KB request limit, and what could happen if the server reads the whole request before checking its size?

The limit I used is 4,096 bytes. It was worked out based on the maximum sizes of the form fields, with some extra room for the JSON data sent with the request.

The reason for checking the size while reading the request is to avoid allowing the server to receive a very large request before rejecting it. If the server reads everything first, someone could send a huge amount of data and make the application use unnecessary memory and resources.

In evidence/12, the test with a 200,000-character name was rejected with `413 Payload Too Large`. This showed that the size limit was working.

## 4. Why did you use both the address and email for rate limiting? What did evidence/14 show?

I used both because I didn't want the rate limit to depend on just one thing. The address limit is 20 requests in 15 minutes, while the email limit is 5 requests in 15 minutes.

During the test, Claude sent 50 login requests, changing the `X-Forwarded-For` address each time. None of them was blocked with `429`. This showed that someone could get around the address limit by supplying different addresses in the request header.

However, the email limit still worked. When six requests were made using the same email but different claimed addresses, the sixth request was blocked with `429 Too Many Requests`.

The test also showed that people using the same address could affect each other's requests because they share the address limit.

## 5. What does fail-open mean for your password breach check, and why did you accept it?

Fail-open means that if the external password breach-check service is unavailable, registration is still allowed to continue.

I accepted this for now because I didn't want patients to be prevented from registering simply because an external service was temporarily unavailable.

However, I understand that there is a risk. If the service is down, a password that has appeared in a known data breach might get through because the application couldn't check it.

The server records the message: `Breach check unavailable: registration allowed without it.` But there is currently no failure count or alert to show how often this happens. That is something that still needs attention.

## 6. Your breach check sends only 5 characters of a hash to Have I Been Pwned. What does the service send back, and who does the final comparison?

The application doesn't send the actual password or its full hash to Have I Been Pwned. It first hashes the password and sends only the first five characters of that hash.

The service sends back a list of matching hash suffixes and how many times each one has appeared in known breaches. My application then compares the returned suffixes with the remaining part of the hash it calculated.

This means the final comparison happens inside my application, not on the Have I Been Pwned service. The service only receives the first five characters, so it doesn't receive the full hash or the actual password.

## 7. The breach check fails open, but the rate limiter fails closed. Why did you choose opposite behaviour?

I chose different behaviours because the two situations have different consequences.

For the breach check, I used fail-open because I didn't want registration to stop simply because an external service was temporarily unavailable. The disadvantage is that a password might not be checked during that period.

For rate limiting, I used fail-closed because it is a security control against repeated requests. If the rate limiter itself fails, the application should not allow requests to continue without that protection.

In the code, a rate-limiter failure returns `503 Service Unavailable`, with a generic message and a `Retry-After` header of 60 seconds. So, I accepted the possibility of missing a breach check temporarily, but not the removal of rate-limit protection.

## 8. Why does a rate-limited request return a generic message instead of saying whether the email or address limit was reached?

I used one generic message so the application doesn't reveal which limit was reached.

The message is: "Too many attempts. Please try again later."

The application returns `429 Too Many Requests` and includes a `Retry-After` header to tell the client how long to wait before trying again.

I also wanted to avoid revealing whether a particular email address had reached its limit. The email counter works whether or not an account exists, so the rate-limiting response doesn't expose whether that email is registered.

## 9. Why do login and password reset return generic messages, while registration gives field-level messages?

I made the difference because of the information each process could reveal.

During login and password reset, I don't want the application to tell someone whether an email address is registered or not. That could make it easier for an attacker to identify people who have accounts on the platform.

Registration is different because the user needs to understand what is wrong with the information they entered. For example, they should know if their name, email or phone number is missing or incorrectly formatted.

So, I used more specific validation messages during registration, while keeping login and reset responses generic to reduce the risk of exposing account information.

## 10. Why does the server trim names and emails but never trim passwords?

Names and email addresses can contain accidental spaces, so I normalise them before storing them. Emails are also converted to lowercase so that the same address isn't treated as different simply because of capital letters.

Passwords are different. Spaces can be part of a password, including at the beginning or end. If I automatically trim a password, I could change what the patient originally created and make it impossible for them to log in with the same password.

That is why I normalise names and emails but leave passwords exactly as entered.

## 11. Why did hashing the same password twice give two different hashes, why is that good, and what does it cost in the database?

The same password can produce two different Argon2id hashes because Argon2id uses a unique random salt each time it hashes a password. This is a good security practice because even if two users choose the same password, their stored hashes will be different. It also makes it harder for attackers to use precomputed tables to crack passwords. The salt is included in the resulting hash, so I don't need to create a separate salt column in the database. The cost is that the hash takes more storage space than the original password, but I consider that a reasonable trade-off because the database stores a secure password hash instead of the actual password.

## 12. Why did your first migration fail on Booking, what were your three fix steps, and what did you decide about the existing booking?

*Drafted by Claude from my files (`evidence/03`, `docs/migrations.md`). I read it and approved it as it stands.*

My first migration attempt failed because I made `patientId` a required column on `Booking`, and that table already had one row. Prisma refused: "Added the required column `patientId` to the `Booking` table without a default value. There are 1 rows in this table, it is not possible to execute this step." The existing booking had nothing to put in the new column. Prisma's own version would also have dropped `name` and `phone` before anything could be copied. I fixed it by hand-writing the migration in three steps: add `patientId` empty, fill it, then make it required and only then drop the old columns. I chose to keep the booking by attaching it to a placeholder patient with an unusable password, not the real person's details. The cost is that the booking now belongs to nobody. Claude ran this at my request, after a backup.

## 13. Why are payment amounts whole kobo integers, and why is PaymentEvent append-only?

I used whole kobo integers for payment amounts because storing money as decimal or floating-point values can lead to rounding problems. Since 100 kobo equals one naira, storing the amount in kobo gives me an exact whole number to work with. In my schema, I used `amountKobo` for both `Payment` and `PaymentEvent`, and also for the service price list. I made `PaymentEvent` append-only so that payment history is preserved. Instead of changing or deleting an earlier record when a payment status changes, a new event is added. This gives the clinic a history of what changed, the previous and new status, the amount, the payment method, who recorded it and when. It also helps with accountability and auditing.

## 14. Why a queue (pg-boss) for the verification email instead of sending it in the registration request?

*Drafted by Claude from my files (`evidence/18`, `docs/verification-design.md`). I read it and approved it as it stands.*

I used a queue so registration doesn't wait for Gmail. In my timing test, registration with the email queued took about 0.46 seconds. Handing one email to Gmail took 2.1 to 2.5 seconds (2,500, 2,277 and 2,142 ms), so sending inside the request would cost about 2.8 seconds, roughly six times as long. That is an estimate from two separate measurements. The bigger risk is that Gmail sometimes didn't answer for 30 seconds from my network, which would leave a patient waiting with no confirmation. With the queue, the patient gets an answer straight away and the worker retries in the background. The cost is that the worker must be running, and I start it by hand with `npm run worker`. If it isn't running, no email is sent.

## 15. Why is the code stored as a keyed hash (HMAC) and not Argon2id or plain SHA-256?

I used a keyed hash, HMAC, to protect the email verification code in the database. The verification code is short, so if I stored it as plain text, anyone who gained access to the database could read it and use it. A plain SHA-256 hash would be better than storing the code directly, but a six-digit code has a very small number of possible combinations, so someone could try all the possibilities against the hash. HMAC adds a secret key that is kept outside the database. This means that having access to the database alone is not enough to calculate and check the possible codes. I used this approach because it is suitable for short verification codes.
