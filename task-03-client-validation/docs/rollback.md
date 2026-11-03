# Rolling back by commit ID

Drafted by Claude at my request from my evidence, so the wording is not all mine. Evidence: `evidence/17a-regretted-change-effect.txt` and `evidence/17-commit-list-and-rollback.txt`.

## The regretted change

I lowered the password maximum from 64 to 6 characters (`passwordMax` in `src/lib/validation/auth.ts`) and committed it as `b4a7cc6`, "lower the password maximum to 6 characters". It was a deliberate exercise, made to be regretted. With a minimum of 8 and a maximum of 6, **no password can pass**: `12345678` and `correct horse battery` were both refused, and the message still said "at most 64 characters" (`17a`).

## What I ran

```
git log --oneline | tee task-03-form-attacked/evidence/17-commit-list-and-rollback.txt
git revert b4a7cc6 --no-edit
```

The revert made a new commit, `5be57dc`, "Revert "lower the password maximum to 6 characters"", and `passwordMax` is 64 again. I checked afterwards that `12345678` and `correct horse battery` are accepted and `short` still gets the "at least 8" message.

## Revert, not reset

I used `git revert`, not `git reset --hard`. The regretted commit, `b4a7cc6`, was **local only**: it had not been pushed (GitHub's `main` was still at `7d9ab11`). So `reset --hard` would have been possible. I still chose `revert` because two later commits sat on top of it, `56a68fd` (the evidence of its effect) and `c690b82` (the README update), and `reset --hard` back to before `b4a7cc6` would have thrown both away. `revert` undoes exactly the one commit I name and keeps everything after it. It also leaves the history intact, which matters because pushing rewritten history is the "can't undo quietly" point on my working-tree drawing, and these commits will be pushed later.

## What went wrong on the way

My first `git revert` stopped in the commit-message editor (Vim). I closed it before saving, which left the undone change staged but not committed. My second attempt then failed with "your local changes would be overwritten by revert". I cleared the staged change with `git restore --staged --worktree src/lib/validation/auth.ts` and ran `git revert b4a7cc6 --no-edit`, which worked. Using `--no-edit` avoids the editor.

## Why naming the commit ID beats describing the change

A description such as "undo the password change" could match several commits, and my history had about fifty. An ID such as `b4a7cc6` names exactly one commit, so Git undoes precisely that change and nothing else, and anyone reading the log can see what was reverted.
