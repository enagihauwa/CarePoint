# The working tree pipeline

My hand drawing is in `evidence/14-working-tree-drawing.jpg`, dated 2/11/2026. This note explains it. Drafted by Claude at my request from my drawing, so the wording is not all mine.

## The four places code lives

1. **My computer: the files I edit.** This is my working folder, `Desktop/CarePoint`. Changes here are only on my laptop, and I can undo them freely.
2. **My computer: the local Git store.** When I commit, the change is saved in the `.git` folder. `main` is my main line of work. `feature-1` is a branch that gets merged back into `main`. `feature-2` is an experiment I decide against and delete, so it never reaches `main`. Everything here is still private.
3. **GitHub.** When I push, my commits go to my repo online (`enagihauwa/CarePoint`). From now on other people can see them and copy them.
4. **Production.** When code is deployed, it becomes the live site that patients use. CarePoint has no production site yet.

## The two lines on my drawing

**"Can't undo quietly after this" is at `git push`.** Before I push, I can amend, reset or delete commits and nobody else knows. After I push, someone may already have seen or copied the code. If I pushed a secret, such as a database password, I have to treat it as leaked even if I delete it straight away, because it stays in the history and may already be copied. Removing it means rewriting history and force-pushing, which other people notice.

**"Users see it after this" is at deploy.** Patients only ever see what is in production. Code on my laptop or on GitHub does not reach them until it is deployed.

## Why this matters for CarePoint

A booking app holds patients' names and phone numbers. A mistake that stays on my laptop costs me nothing. A mistake pushed to GitHub can expose a secret. A mistake deployed to production can lose or leak a real patient's booking. So the further right a change goes, the more carefully I should check it first.
