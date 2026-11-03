# CarePoint Clinic – Task 2 Interview Answers

### 1. Your scaffold prompt didn't tell the agent about the stack, folders or font, so it asked five questions first. Was that a good or a bad outcome, and what would you change in the prompt?

I think it was a good outcome because the agent did not just make assumptions about important parts of my project. Instead, it asked five questions to clarify things like where the application should be located, which font to use, and how to handle spacing values. However, I could have made the first prompt more specific to CarePoint. My initial prompt was more like a general instruction and did not include the actual stack, folder structure or font requirements. If I were writing it again, I would include the project-specific details from the beginning, such as Next.js at the repository root, the `src/app` folder, DM Sans and the design token rules. This would reduce unnecessary back-and-forth.

### 2. The plan listed no assumptions. Why did you doubt that, and what checks did you make?

I doubted that the plan had made no assumptions because some decisions were made without being clearly stated or confirmed. For example, it selected Next.js 16, React 19 and TypeScript 7; changed some width values to fit the spacing tokens; used only the Latin subset of DM Sans; and assumed Prisma and Zod were not needed at the scaffolding stage. It also interpreted "Task 1 docs" as the `task-01-design-system/docs/` folder. I read the plan and compared its summary with `AGENT-RULES.md` and the business brief. With Claude's help, I also reviewed the results of checks on the token file, `.env` ignore rule and hardcoded values in `src/`. This showed me that a plan can omit assumptions even when the agent has made several decisions.

### 3. What happened when you ran `npm run dev` from the Desktop, and what was different about running it from `app-nested`?

When I ran `npm run dev` from the Desktop, npm returned an `ENOENT` error because it could not find `package.json` at `C:\Users\USER\Desktop`. The project's `package.json` was inside the CarePoint folder. However, running the command from `app-nested` did not cause the same error. npm searches up the folder tree for the project's `package.json`, so it found the one in the CarePoint root and ran the project normally. The output confirmed this by showing the project directory as `C:\Users\USER\Desktop\CarePoint`. I also asked Claude for a second opinion, and its response helped explain why the Desktop command failed. The lesson was that the working directory matters, but a nested folder inside a project is not necessarily a problem.

### 4. How did you find and stop the process using port 3000?

When I tried to start the development server, Next.js reported that port 3000 was already in use and that another server was running. I asked Claude to run the diagnostic commands for me. The `netstat -ano | grep :3000` output showed that PID `47004` was listening on port 3000. The `tasklist` output identified the process as `node.exe`. I had also tried running `taskkill /PID` myself in Git Bash, but it treated `/PID` as a folder path. The working command in that terminal was `taskkill //PID 47004 //F`. Claude ran it successfully, and a second `netstat` check showed that nothing was listening on port 3000. I then restarted the development server, which was ready on port 3000.

### 5. How did you investigate the `/book` 404, and which check showed the cause?

I deliberately created the 404 to practise troubleshooting, so I already knew the cause. I first checked the browser URL and confirmed that `localhost:3000/book` was correct. I then checked the route filename on disk with the agent's help. It showed `pages.tsx` instead of the required `page.tsx`, which was the cause of the 404. I checked the browser Console as well; it showed `GET /book 404 (Not Found)` and no JavaScript errors. The Network tab screenshot was taken after the fix, so it showed status 200, not the original 404. I also reviewed the curl result and server log. Renaming the file to `page.tsx` restored the route.
