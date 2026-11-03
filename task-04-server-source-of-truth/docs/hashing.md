# Hashing: Argon2id against SHA-256

Script: `scripts/hash-timing.js`. Library: `argon2` 0.45.2. Outputs: `evidence/07-hash-twice-different.txt` and `evidence/08-timing-argon-vs-sha.txt`. All numbers below come from `08`, run on my own machine. This document was drafted by Claude from my written answers, so I should check the wording is still mine before I submit.

## What the script printed

Every hash starts with `$argon2id$v=19$m=65536,t=3,p=4$`. That is Argon2 version 19, 64 MiB of memory, 3 passes and 4 parallel lanes. The library chose these settings. I did not set them.

| | Argon2id | SHA-256 |
|---|---|---|
| Time for one hash (`08`) | 77.29 ms | 0.00346 ms (average of 1000) |
| Guesses per second | 12.9 | 288,775 |

## The arithmetic

Guesses per second = 1000 ÷ milliseconds per hash.

- Argon2id: 1000 ÷ 77.29 = about 12.9 guesses per second.
- SHA-256: 1000 ÷ 0.00346 = about 288,775 guesses per second.

On this machine SHA-256 is roughly 22,000 times faster than Argon2id.

The SHA-256 time is noisy. In `07` it was 0.0512 ms (about 19,500 guesses per second), 15 times slower than in `08`, so the gap in `07` is only about 1,700 times. I use `08` because it is the file the guide names for timing, and I do not treat 22,000 times as an exact figure. These are also measurements from my machine, not the speed of a real attacker with GPUs.

## The inversion: why slow is good here

A patient logs in once, so a hash that takes about 77 ms costs them almost nothing. I do not think they would notice a delay that small, and I think it is an acceptable price for better password protection. A login is the only moment the delay is felt.

An attacker who steals the database is in the opposite position. They must try a very large number of passwords. At 77 ms a guess, Argon2id allows only about 12.9 guesses a second on my machine, against about 288,775 for SHA-256, so they have to spend far more time to get through the same list.

## Salting

Hashing the same password twice gave two different hashes (`same password, same hash? false`, in both `07` and `08`), and both still verified (`true true`). The difference is the salt, a random value mixed in each time. In the hash string it is the segment after `p=4$`, for example `DmgETFHLYHcdpLtGALYVWQ`.

- **The library handles it.** The salt is stored inside the hash string, so I do not need a separate salt column in the database.
- **With a unique salt**, two patients who choose the same password get different stored hashes.
- **Without a salt**, the same password would give the same hash for both patients, so anyone reading the database could spot accounts that share a password.
- **Rainbow tables:** without a salt, attackers can use precomputed tables of hashes, called rainbow tables, to look up common passwords more quickly instead of calculating each hash from scratch. A unique salt for every password makes those precomputed tables ineffective, because the same password produces a different hash with a different salt.
