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

The service responds with a list of matching hash suffixes and how many times each one has appeared in known data breaches. My application then checks the returned list against the remaining part of the hash it already calculated.

This means the final comparison happens on my application, not on the Have I Been Pwned service. The service only receives the first five characters, so it doesn't receive the actual password or the full hash needed to identify the password directly.

## 7. The breach check fails open, but the rate limiter fails closed. Why did you choose opposite behaviour?

I chose different behaviours because the two situations have different consequences.

For the breach check, I used fail-open because I didn't want registration to stop just because an external service was temporarily unavailable. The disadvantage is that a password might not be checked during that period.

For rate limiting, I used fail-closed because it is a security control against repeated requests. If the rate limiter cannot work properly, I don't want the application to simply allow unlimited requests. That could make it easier for someone to abuse the login or registration endpoints.

So, I accepted the risk of temporarily missing a breach check rather than blocking registration, but I didn't want a failure in rate limiting to remove that protection.

## 8. Why does a rate-limited request return a generic message instead of saying whether the email or address limit was reached?

I used a generic message so the response doesn't reveal which rate-limit condition was triggered.

If the application tells someone that a particular email has reached its limit, it could give an attacker useful information about that email address and the activity associated with it.

The `429 Too Many Requests` status code tells the person that they need to wait before trying again. The `Retry-After` header also gives information about when they can try again.

My intention was to provide enough information for a genuine user without exposing unnecessary details about the security checks.

## 9. Why do login and password reset return generic messages, while registration gives field-level messages?

I made the difference because of the information each process can reveal.

During login and password reset, I don't want the application to tell someone whether an email address is registered or not. That could allow an attacker to find out which people have accounts on the platform.

Registration is different because the user needs to understand what is wrong with the information they entered. For example, they should know if their name, email or phone number is missing or incorrectly formatted.

So, I used more specific validation messages during registration, while keeping login and reset responses generic to reduce the risk of exposing account information.

## 10. Why does the server trim names and emails but never trim passwords?

Names and email addresses can contain accidental spaces, so I normalise them before storing them. Emails are also converted to lowercase so that the same address isn't treated as different simply because of capital letters.

Passwords are different. Spaces can be part of a password, including at the beginning or end. If I automatically trim a password, I could change what the patient originally created and make it impossible for them to log in with the same password.

That is why I normalise names and emails but leave passwords exactly as entered.
