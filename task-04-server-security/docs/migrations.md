# Migrations

Drafted by Claude at my request, so the wording is not all mine. Claude Code ran these commands on my machine **at my request**, after taking a backup. My rule 6 normally says I run migrations by hand, and I waived it for this step.

## What I tried first, and why it failed (`evidence/03`)

I changed `prisma/schema.prisma` to match my paper design and ran `npx prisma migrate dev --name add_accounts_and_payments`. Prisma refused, and applied nothing:

> Added the required column `patientId` to the `Booking` table without a default value. There are 1 rows in this table, it is not possible to execute this step.

A column that must have a value cannot be added to a table that already has rows, because the existing row has nothing to put in it. A migration that has to leave the table in a state it cannot be in will not run. The same would happen on a live clinic's table. The only reason it is mild here is that there was one row.

Prisma also warned that it would drop `Booking.name` and `Booking.phone`, which held real data, and add two unique rules.

## The fix, in three steps (`prisma/migrations/20261103221500_add_accounts_and_payments/migration.sql`, `evidence/04`)

1. **Add the column empty.** `patientId` is added **nullable**, so the existing row is allowed.
2. **Fill it.** A placeholder user and patient are created, and the existing booking is pointed at that patient.
3. **Require it.** Only now is `patientId` set to `NOT NULL`, and only after that are the old `name` and `phone` columns dropped.

Prisma's own SQL would have dropped `name` and `phone` before anything could be copied, and added `patientId` as required in one go. I had to rewrite the file by hand. I created it with `prisma migrate diff` and applied it with `prisma migrate deploy`, because `migrate dev` needs an interactive terminal.

## The placeholder, honestly

The one existing booking belonged to a real person. I did **not** copy their name or phone anywhere. The placeholder is `unclaimed-bookings@example.invalid` with the name "Unclaimed bookings (placeholder)":
- the `.invalid` address cannot receive mail,
- the password hash is `!`, which is not a valid hash, so nobody can log in as it,
- its phone is the word `placeholder`,
- its `termsAcceptedAt` is the time of the migration. **That is not a real acceptance of the terms.** The column is required, so it needed some value.

**The cost:** the booking is now attributed to nobody. Its original name and phone were dropped from the database. They exist only in a backup outside the repo.

## A mistake of mine on the way (`evidence/04a`)

My first hand-edited file failed with a syntax error. My script split Prisma's SQL on blank lines, and one `CREATE TABLE` has a blank line inside it, so its last line was cut off. Postgres rejected the file and nothing changed, but Prisma recorded the migration as failed and refused to apply any more. I cleared that record with `prisma migrate resolve --rolled-back`, rebuilt the file, and the second attempt applied cleanly.

## The result (`evidence/05`)

Nine tables plus Prisma's own. The booking has `patientId` 2, the placeholder user has id 1, and the 5 doctors are untouched. `Booking` now shows the unique rule on doctor, date and time.

## Not done

- **The drift error is shown in `evidence/05b`.** I added a column by hand to a throwaway database. `migrate status` still said "up to date", but `migrate dev` found the difference, refused to go on, and offered only `migrate reset`, which wipes the data. Nothing was changed.
- **My own screenshots** of `\dt` before and after. Claude's text captures are `02-...-claude-capture.txt` and `05-...-claude-capture.txt`.
- **A way to undo.** Migrations here only go forward. Going back means restoring the backup or writing a new migration.
