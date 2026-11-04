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
