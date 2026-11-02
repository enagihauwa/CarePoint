# Performance note: first load of the home page

Evidence: `evidence/03-server-start.txt`, `evidence/04-first-load.txt`. Run on my own machine (Windows 11, Next.js 16.4.3 with Turbopack, `npm run dev`).

## What I measured

| What | Value | Source |
|---|---|---|
| First load, as seen by `curl` | `time_total` 4.742331 seconds, so **about 4742 ms** | `04-first-load.txt` |
| Same request, as reported by Next.js | `GET / 200 in 979ms` (586 ms in Next.js, 393 ms in application code) | `03-server-start.txt` |
| Server start | `Ready in 890ms` | `03-server-start.txt` |
| Cold compile | The log shows `Compiling /` before the first request was answered | `03-server-start.txt` |

The file `04-first-load.txt` labels the number `time_ms`, but the value is in seconds. I did not edit the evidence file. The first load was measured once, on a cold server.

After the first load I ran extra requests against the warm server. These are diagnostics and not first-load evidence:

| Request | connect | first byte | total |
|---|---|---|---|
| `localhost` | 0.6 ms | 378 ms | 382 ms |
| `127.0.0.1` | 0.7 ms | 80 ms | 80 ms |
| `localhost`, again | 1.4 ms | 126 ms | 129 ms |
| `localhost` (my own run) | 13.6 ms | 259 ms | 263 ms |
| `127.0.0.1` (my own run) | 1.5 ms | 130 ms | 133 ms |

These are single samples, so I do not draw conclusions from the differences between them.

## What I tested and ruled out

I suspected that connecting to `localhost` was slow (for example, an IPv6 address tried first). The warm-server runs show a connect time of under 15 ms for both `localhost` and `127.0.0.1`, so connection setup is not the cause.

## What I do not know

The server says it answered in 979 ms, but `curl` waited 4742 ms. About 3.7 seconds is not accounted for by anything I measured. These are guesses, and I have not tested any of them:

- The first request triggered work that Next.js does not count in its reported time, such as compiling the CSS or loading the font file.
- My machine was busy at that moment (an editor and other programs were open).
- Something that only happens on the very first request on this machine.

I have measured the cold start only once, so I cannot say whether 4.7 s repeats. A second cold start would show that.

## Gap to target

The assignment gives no first-load target, so I have not measured against one. For a clinic whose patients use low-cost phones on slow data, a development-mode first load is also not a fair measure of what patients will see. This is `npm run dev`, which compiles on demand. A production build (`npm run build` then `npm run start`) is what patients would use, and I have not measured that.
