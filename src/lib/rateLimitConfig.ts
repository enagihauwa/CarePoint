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
} as const;

export const EMAIL_LIMITS = {
  // 5 tries per 15 minutes is at most 5 x 4 x 24 = 480 guesses per account per day.
  login: { max: 5, windowMs: 15 * MINUTE },
  // Nobody needs more than a couple of reset emails an hour. This caps inbox flooding.
  reset: { max: 3, windowMs: HOUR },
} as const;

// The most counters kept in memory. When it is full, expired ones go first, then the oldest.
export const STORE_MAX_KEYS = 10_000;
