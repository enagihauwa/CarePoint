# CarePoint Clinic – Task 2 Interview Answers

### 1. The initial scaffold prompt

I think the agent did the right thing by asking questions before starting. My initial prompt did not provide all the details it needed, such as the exact project location, font preference, spacing and radius values, and the content to use for the home screen. Instead of making assumptions, it asked five questions to clarify these details. I answered them before allowing it to proceed. This helped ensure that the setup followed the existing project structure and design system. If I were doing this again, I would include the technology stack, folder structure, font requirements, design-token instructions and home screen reference in my first prompt. That would reduce unnecessary back-and-forth.

### 2. Reviewing the agent's plan and assumptions

The agent's plan did not have a separate assumptions section, which made me question whether it had identified everything it was deciding on its own. I reviewed the plan and compared its summary with `AGENT-RULES.md` and the business brief. With Claude's help, I also checked the generated files, `.gitignore` and the source files for raw design values. Some assumptions included choosing Next.js 16 and React 19, changing certain layout widths to fit spacing values, using only the Latin subset of DM Sans, and deciding which project dependencies were needed. I also noticed that it assumed the Task 1 documentation was located in a particular folder. This taught me to review an agent's plan carefully before approving implementation.

### 3. Running the development server from the wrong folder

When I ran `npm run dev` from my Desktop, I got an `ENOENT` error. The message showed that npm could not find `C:\Users\USER\Desktop\package.json`. The problem was that I was outside the CarePoint project folder, where the `package.json` file was located. However, running the command from the `app-nested` folder inside the project worked because npm was able to find the package file in the parent directory. This helped me understand that npm can look up the folder structure for a package file. The important thing is to make sure I am working within the correct project structure and that npm can locate the required configuration file.

### 4. Finding and resolving the port conflict

When I tried to start the development server, Next.js reported that port 3000 was already in use and started another server on port 3001. The process using port 3000 had PID `47004`. At my request, Claude ran `netstat -ano | grep :3000` to identify the process, and `tasklist` confirmed that it was `node.exe`. It then stopped the process using `taskkill //PID 47004 //F` and checked again to confirm that nothing was listening on port 3000. I also tried using `taskkill /PID`, but Git Bash interpreted the slash incorrectly. Using double slashes worked. This taught me how to identify and stop a process occupying a port.

### 5. Investigating the 404 error

I deliberately created the 404 error as part of the exercise. I first created the route using `page.tsx` and confirmed that it returned 200. I then renamed the file to `pages.tsx`, which caused `localhost:3000/book` to display a 404 error. I checked the browser URL and Console, which showed `GET /book 404 (Not Found)`. With the agent's help, I also checked the file structure on disk and identified that Next.js expected the exact filename `page.tsx`. I renamed it correctly, and the route worked again. My Network screenshot was captured after the fix, so it showed a successful 200 response, not the original 404.

### 6. What HTTP 201 means and how I verified a booking

HTTP 201 means **Created**. It indicates that a request has successfully created a resource. In CarePoint, the first evidence was the `POST /api/bookings 201` entry in the server log, showing that the booking endpoint returned a successful response. However, I wanted to confirm that the booking was actually stored, not just that the request appeared successful. I therefore opened Prisma Studio and checked the `Booking` table directly. The screenshot showed two records, with IDs 3 and 4, including the patients' names, doctor IDs, appointment dates, phone numbers and times. This confirmed that the bookings had been persisted in the database. The log and database records together provided stronger evidence than a success message alone.

### 7. How the false-success problem happened

When I opened the application using `10.245.248.231:3000/book`, the form appeared, but submitting it did not produce the expected result. The server logs showed that Next.js had blocked cross-origin access to its development resources from that address. As a result, the form's JavaScript did not run. The browser submitted the form as a GET request to `/book` instead of sending a POST request to `/api/bookings`. The server returned HTTP 200, which could easily mislead someone into thinking the booking had succeeded. However, the database still contained zero booking records after that test. This taught me that a successful page response does not necessarily mean that the actual operation was completed.

### 8. What I changed to prevent false success

The earlier safeguards in the form could not prevent the false success because they depended on JavaScript running in the browser. When the development scripts were blocked, the form's JavaScript did not execute. I therefore approved two changes, which Claude made. First, `method="post"` was added to the form at `BookingForm.tsx:86`. This ensures that personal details are submitted in the request body rather than appearing in the URL. Second, a `ready` state using `useEffect` at line 19 disables the booking button until the script has loaded, using `disabled={!ready ...}` at line 141. A visible message also explains that the form has not finished loading and cannot book yet. These changes prevent users from submitting a form that is not ready.

### 9. Testing what happens when the database is unavailable

I first ran the database-down test myself. The booking page displayed a message saying that the doctors could not be loaded and booking was unavailable. I also tested the booking write. The direct POST request returned HTTP 500 with the message, "We could not save your booking. Nothing was booked." The log showed `Booking write failed` because database access was denied, and no booking was saved. The evidence file `13-write-failed-logs.txt` was later re-run by Claude at my request. We also found an important gap: although the page displays an error, it still returns HTTP 200, as shown in `src/app/book/page.tsx` at lines 22 and 40. A monitoring system checking only HTTP status codes could therefore incorrectly report the page as healthy.

### 10. Why I used different models

I used Claude Sonnet 5.5 for the initial scaffold, Claude Opus 5.5 for the booking form, API, Prisma models and doctor seed, and Sonnet 5.5 again for Step 10, the information design work. During scaffolding, Sonnet asked five questions before writing code, as my prompt required. During the form implementation, Opus read the context files, asked me four decisions and caught one of its own hardcoded values. However, its first version of the form had a false-success problem that needed fixing. During information design, Sonnet caught and corrected its own duplicated page title. I also briefly switched between Sonnet and Opus while testing, but no work was done between those switches, so the changes had no effect on the code. I later had the session records checked to confirm which model handled each task.

### 11. Have you ever committed a secret to a repository? If one leaked, what would you do?

I have not identified any evidence of a secret being committed to my CarePoint repository. My `.gitignore` excludes `.env`, and the actual database password is not stored in that file. The `.env.example` file provides the configuration template without exposing the real password. I also checked that `.env` was not printed in the evidence. If a real secret were accidentally pushed to GitHub, I would treat it as exposed, immediately revoke or rotate it, and replace it with a new secure value. I would then check the Git history and remove the exposed secret from the repository history where necessary. I would not assume that deleting the file or making another commit had made the leaked credential safe.

### 12. A fresh clone of your repository failed in two places. What happened, and why had you not seen them before?

The fresh-clone test found two problems. First, the README instructed users to run `npx prisma generate` before creating `.env`, but Prisma needed `DATABASE_URL` from that file even for generation. Second, the copied `.env.example` contained an empty `SITE_URL`, which caused `new URL("")` to throw an `Invalid URL` error and made `/book` return HTTP 500. Claude Code ran this fresh-clone test on my machine at my request; it was not performed by another person. I had not seen these problems because my existing environment was already set up, and my `.env` did not contain a `SITE_URL` line. The README order and the fallback in `layout.tsx` were corrected.

### 13. What was the BOM problem in `.env.example`, and how did you confirm it?

Claude tested it and showed me that, with the BOM present, the real `DATABASE_URL` variable was unset. The first variable was named `﻿DATABASE_URL`, with an invisible character in front, instead of `DATABASE_URL`. This meant the application could not read the expected database connection variable. I confirmed the issue and the three BOM bytes were removed from `.env.example`. This taught me that a file can look perfectly normal but still contain invisible characters that affect how configuration values are read.

### 14. Why are your booking numbers 3 and 4 instead of 1 and 2?

The booking records initially had IDs 3 and 4 because the first two test records had been created and later deleted. PostgreSQL does not automatically reset its auto-increment sequence when records are deleted, so the next records continued from ID 3. After row 3 is deleted, only the dummy record `[name removed]` remains. The IDs do not mean that records 1 and 2 are still in the database; they simply show that those numbers were previously used. This is normal database sequence behaviour.

### 15. Explain your working-tree drawing. Where is the point you cannot undo quietly, and why?

My drawing shows how code moves through four places: my working folder, my local Git repository, GitHub and production. Changes in my working folder are private, and I can edit or discard them. When I commit, they are saved in my local Git history. The point marked "Can't undo quietly after this" is `git push`. Before pushing, I can amend or reset my local commits without other people seeing them. Once pushed, someone may already have viewed or copied the code. If I pushed a secret, deleting it afterwards would not guarantee that it was safe. The second point, deployment, is where users begin seeing the code. CarePoint has no production site yet.
