# Removing a real person's name from git history

Drafted by Claude at my request, so the wording is not all mine. Claude Code ran every command on my machine at my request, on 4 November 2026.

## What happened

An unredacted screenshot of the `Booking` table (`task-02-scaffold-ship-and-find/evidence/12-database-rows.png`) was committed on 2 November, in the commit that added the booking page. It showed the name of a **real person** and a phone number that I had made up. I replaced it with a redacted version on 3 November, but the old file stayed in git history. One sentence in my Task 2 interview answer also named the person, and called the record "dummy", which was wrong. The repository is **public**, and I want it to stay public, so the name was readable by anyone from 2 November.

## What I decided

- The repo stays public.
- The phone number is made up, so it stays everywhere it appears (my Task 4 test script and `evidence/12b` use the same made-up number as test input).
- Only the real person's name is removed.

## What was done

1. **Checked first.** Looked for every place the name appears: the old image in one commit, and the sentence in the Task 2 interview answers from the next day onward. Fixed the sentence in the current files.
2. **Tested on a throwaway copy of the repo** before touching the real one. Result: no trace of the name in any file of any commit, and the final files identical to mine except the one image.
3. **Backed up** the whole repository to a git bundle outside the project folder (`CarePoint-backup-before-history-rewrite.bundle` on the Desktop, 6.3 MB, verified). **That bundle still contains the name. It must never be pushed or shared, and I delete it once I am sure the rewrite is right.**
4. **Rewrote the history** of both local branches (`main` and `feature/information-design`, 154 commits) with `git filter-branch`: the image removed from every commit, and the name in the interview answers replaced with "[name removed]". It took about 2.5 minutes. Commits before the first affected one kept their hashes. **126 of the 154 commits got new hashes.**
5. **Deleted git's own backup refs and a stash** that would have kept the old commits alive on my machine, then ran garbage collection. A search of every local commit found no trace of the name, and the old image is in no commit.
6. **Re-added the redacted screenshot** in one new commit.
7. **Fixed the old commit hashes quoted in my documents.** I mapped each old commit to its new one by date and message (all 154 paired exactly) and replaced 119 short hashes in 13 files. Some of those files are **recorded outputs** of git commands I ran earlier (for example `task-02-scaffold-ship-and-find/evidence/15-git-log-graph.txt` and `task-03-client-validation/evidence/17-commit-list-and-rollback.txt`). Their text was edited after the fact so the hashes match the rewritten history. The original output is no longer in the repo, so these files are **not** the untouched record of that moment. The affected files are listed in the commit that made the change.

## What I did not fix, and cannot

- **GitHub keeps copies.** The merged pull request (PR #1) holds references to the old commits, and GitHub caches commit pages. A force-push does not remove those. Removing them needs a request to GitHub Support. Until they do it, the old commit may still open by its direct address.
- **Anyone who cloned or forked the repo before the rewrite still has the old history.** I cannot remove that.
- **Every old commit hash is gone.** Any link or note outside this repo that names an old commit now points nowhere.
- **The original commits' dates survive,** so the history still shows the real order and timing of my work.

## Not done yet at the time of writing

- The force-push to GitHub (I run it myself).
- The request to GitHub Support.
- Deleting the backup bundle.
