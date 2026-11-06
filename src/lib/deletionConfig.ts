// Account deletion (Task 5, piece 6). The reasons are in task-05-sessions-compliance-defence/docs/decisions.md, decision 5.

// How long a patient has to change their mind. A patient who asks by accident can cancel; pending bookings and
// payments have time to settle; still prompt enough for "without undue delay". My number, not measured.
export const GRACE_DAYS = 14;

// The purge runs once a day, at night, when the clinic is closed and the database is quiet. 02:00 Lagos time is my
// choice of "night", not a measured quiet hour. The worker (npm run worker) must be running for it to happen.
export const PURGE_CRON = "0 2 * * *";
export const PURGE_TIMEZONE = "Africa/Lagos";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function purgeDate(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + GRACE_DAYS * DAY_MS);
}
