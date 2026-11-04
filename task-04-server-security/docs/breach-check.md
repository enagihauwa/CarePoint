# Breach check

Drafted by Claude at my request from the code and the evidence, so the wording is not all mine. Evidence: `evidence/15-breach-check-results.txt`, `15b-breach-check-regression.txt`, `15c-breach-check-logic-checks.txt` and `15a-breach-rejection-claude-capture.png`. Claude ran every test against the real service, on a throwaway database that was dropped afterwards. My own screenshot of the refusal (`15-breach-rejection.png`) is still to be taken.

## What it does

When a patient registers, the server asks the Have I Been Pwned service whether the password has appeared in a known data breach, and refuses it if it has (`src/lib/breachCheck.ts`, called from `src/app/api/register/route.ts`). It runs on **registration only**, after the rate limit and after the length rules, so it only runs for an otherwise valid request.

`password123` passes my length rules (it is 11 characters) but has appeared in breaches **2,266,543 times**. The server refuses it with a message under the Password field (`15`, A1), and the sign-up form shows that message without claiming anything was saved (`15b`).

## How it works without sending the password (k-anonymity)

1. The server makes a SHA-1 hash of the password. For the word `password` that is `5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8`.
2. It sends **only the first 5 characters**, `5BAA6`, to `https://api.pwnedpasswords.com/range/5BAA6`.
3. The service answers with **every** breached hash that starts with those 5 characters. The padded answer I received for `5BAA6` had 2,028 lines, each a 35-character remainder and a count.
4. The server compares the remaining 35 characters **itself**, in its own memory.

So the service never receives the password or the full hash, and it cannot tell which of the thousands of candidates I was looking for. I checked this with a pretend service that records every request: the address held only the 5 characters, and neither the password nor the other 35 characters appeared anywhere in the request (`15c`). SHA-1 is used only because the service's list is made with it. It is not used to store passwords (that is Argon2id, `docs/hashing.md`).

An `Add-Padding` header makes every answer a similar size, so the size of the answer does not hint at how many hashes share the prefix.

## If the service cannot be reached: fail open

If the call fails, times out after 4 seconds, or the service answers with an error, the registration **goes ahead without the check**, and the server logs "Breach check unavailable". I chose to fail open because a third party's outage should not stop a patient registering, and this check is an extra layer on top of the length rules and the rate limit. The cost is that during an outage a breached password can get through. I tested every failure case with a pretend service (`15c`).

This is the opposite of the rate limiter, which **fails closed** (`docs/rate-limiting.md`), because the rate limiter is the protection itself.

## What it costs

A registration that passes took about **0.26 to 0.36 seconds** once the connection was warm, and 0.3 to 1.1 seconds on the first calls (`15`, parts A and B). Separate `curl` calls to the service took about 0.9 to 1.0 seconds each, with 2.6 seconds on the very first (cold) call, which is why the timeout is 4 seconds. A rejected request still pays for the call.

## What it does not do

- **It does not make a password strong.** A password that is not on the list can still be weak, and `Q7-lamp-zeta-9Rk2-orbit` passing (`15`, A4) only means it has not been seen in a breach.
- **It is a list of passwords already exposed**, so a brand-new password chosen by a patient is never on it.
- **It depends on a third party.** Their list, their availability and their honesty about what they log.
- **It checks only at registration.** A password change or reset must call it too, and that must be added when reset is built.

## What I noticed while testing

My own Task 3 test password, 64 letter p's, has appeared in breaches 10 times. The server now refuses it, so that one case in the 19 form attacks changed from `201` to `400`. The other 18 are unchanged (`15b`).
