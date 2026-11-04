// Session settings for Task 5. The reasons are in task-05-sessions-compliance-defence/docs/decisions.md.
export const SESSION_COOKIE = "carepoint_session";

// Patients book rarely on their own phones, so a long session suits them. The front desk sees every
// patient and uses a shared computer, so its session is one working day.
export const PATIENT_SESSION_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60; // 8 hours

// Lax, not Strict: patients arrive from links in emails and WhatsApp messages, and Strict would log
// them out on every such click. Lax still withholds the cookie from cross-site POSTs.
export const SESSION_SAME_SITE = "Lax";
