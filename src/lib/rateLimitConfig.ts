// Rate limits for the account endpoints (Task 4, step 8). The reasons are in
// task-04-server-security/docs/rate-limiting.md. Every attempt is counted, successful or not,
// because there are no accounts yet to tell them apart.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const ADDRESS_LIMITS = {
  // Generous on purpose: several staff at one reception desk, or many patients on one mobile
  // network, can share a single address.
  login: { max: 20, windowMs: 15 * MINUTE },
  reset: { max: 10, windowMs: HOUR },
  // A proposal, not derived from the clinic: nobody has measured how many patients the front desk
  // registers in an hour.
  register: { max: 10, windowMs: HOUR },
  // Email verification (task-04-server-security/docs/verification-design.md). A proposal, not measured.
  verify: { max: 20, windowMs: 15 * MINUTE },
  resend: { max: 10, windowMs: HOUR },
  // Choosing a new password with an emailed code. The same numbers as verify: a proposal, not measured.
  resetConfirm: { max: 20, windowMs: 15 * MINUTE },
} as const;

export const EMAIL_LIMITS = {
  // 5 tries per 15 minutes is at most 5 x 4 x 24 = 480 guesses per account per day.
  login: { max: 5, windowMs: 15 * MINUTE },
  // Nobody needs more than a couple of reset emails an hour. This caps inbox flooding.
  reset: { max: 3, windowMs: HOUR },
  // The code's own cap of 5 wrong tries is what stops guessing. At most 3 new codes an hour is 15 guesses
  // an hour against 1,000,000 possibilities.
  verify: { max: 10, windowMs: 15 * MINUTE },
  resend: { max: 3, windowMs: HOUR },
  // As for verify: the code's own cap of 5 wrong tries is what stops guessing (docs/password-reset.md).
  resetConfirm: { max: 10, windowMs: 15 * MINUTE },
} as const;

// The most counters kept in memory. When it is full, expired ones go first, then the oldest.
export const STORE_MAX_KEYS = 10_000;
