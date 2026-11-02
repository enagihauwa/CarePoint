# 404 investigation: /book

I caused this 404 on purpose. I created `src/app/book/page.tsx`, confirmed `/book` returned 200, then renamed the file to `pages.tsx` (plural). These are the checks, in the order I made them. This document was drafted by Claude at my request from my screenshots, the evidence files and the server log, so the wording is not all mine. Each check says where its information came from.

## 1. URL
Source: my browser screenshot, `evidence/09c-404-browser.png`.

The address bar read `localhost:3000/book`. The spelling and the port are right, so the URL was not the problem. The page body showed Next.js's standard "404 | This page could not be found."

## 2. Route file name
Source: the file system, observed by the agent, not in my browser.

- Folder: `src/app/book/`
- File found: `pages.tsx` (plural)
- File Next.js looks for: `page.tsx` (singular)

Next.js only treats a file named exactly `page.tsx` as a route. `pages.tsx` is ignored, so `/book` has no page to render.

## 3. Console (F12)
Source: my screenshot, `evidence/09d-404-console.png`.

The Console showed one red error: `GET http://localhost:3000/book 404 (Not Found)`. The other lines were the React DevTools notice and `[HMR] connected`. There were no JavaScript errors. So the browser received a 404 for the page request itself, and nothing in the page's own code failed.

## 4. Network tab
Source: my screenshot, `evidence/10b-network-after-fix.png`, and the `curl` evidence.

My Network screenshot was taken **after** the fix, so it shows the `book` document with Status **200** (687 ms), not the 404. I do not have a Network-tab capture of the 404. The 404 is shown by:

- `evidence/09-404-error.txt`, which holds `status=404 time_ms=0.793037`. The value is curl's `time_total` in **seconds**, so it is about 793 ms. The `time_ms` label is misleading.
- The console error in check 3.
- The server log in check 5.

## 5. Server log
Source: the log of the `npm run dev` server, as saved in `evidence/09b-server-log-404.txt`. That server was started by Claude in the background, so I did not read these lines in a terminal I was watching.

```
GET /book 200 in 862ms (next.js: 494ms, application-code: 368ms)
GET /book 404 in 772ms (next.js: 554ms, application-code: 218ms)
```

The first line is from before the rename and the second is from after it. The log also holds later 404 lines from my own browser reloads, and then 200 lines again after the fix. The server wrote this log into `08-port-conflict-resolved.txt` while it ran. I copied the whole log to `09b-server-log-404.txt` and restored `08` to its clean restart output.

## Conclusion
The server was up and the URL was right. The browser, `curl` and the server log all reported 404, and the log showed the same route returning 200 before the rename. That pointed at the route. The file-name check (check 2) showed the cause: `pages.tsx` instead of `page.tsx`. The console, `curl` and log checks showed that the problem was a missing route and not a browser or JavaScript error.

## Fix
I renamed `src/app/book/pages.tsx` back to `src/app/book/page.tsx`. A `curl` to `/book` returned `status=200 time_ms=0.085968`, about 86 ms (`evidence/10-404-resolved.txt`). The server log shows `GET /book 200` again after the rename.
