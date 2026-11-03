import { respond } from "./respond";
import { ADDRESS_LIMITS, EMAIL_LIMITS, STORE_MAX_KEYS } from "./rateLimitConfig";

// A fixed-window counter. Known weakness: a burst that straddles the end of one window and the
// start of the next can get up to twice the limit through.
export type Limit = { readonly max: number; readonly windowMs: number };
export type Hit = { count: number; resetAt: number };
export type Decision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export interface RateStore {
  hit(key: string, windowMs: number, now: number): Hit;
}

// Counters live in this server process's memory. Limits of that choice, also in rate-limiting.md:
// they are lost on every restart, each server instance counts on its own, and the store is capped
// so that someone inventing endless emails cannot grow it without limit.
export class MemoryStore implements RateStore {
  private entries = new Map<string, Hit>();

  constructor(private readonly maxKeys: number = STORE_MAX_KEYS) {}

  get size() {
    return this.entries.size;
  }

  hit(key: string, windowMs: number, now: number): Hit {
    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      this.entries.delete(key); // re-insert, so the newest keys are last
      this.entries.set(key, entry);
      this.trim(now);
    }
    entry.count += 1;
    return { count: entry.count, resetAt: entry.resetAt };
  }

  private trim(now: number) {
    if (this.entries.size <= this.maxKeys) return;
    for (const [key, entry] of this.entries) if (entry.resetAt <= now) this.entries.delete(key);
    while (this.entries.size > this.maxKeys) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

// One store for the whole server, shared by every route.
const shared = globalThis as unknown as { __carepointRateStore?: RateStore };
export const defaultStore: RateStore = (shared.__carepointRateStore ??= new MemoryStore());

export function consume(store: RateStore, key: string, limit: Limit, now: number = Date.now()): Decision {
  const { count, resetAt } = store.hit(key, limit.windowMs, now);
  if (count <= limit.max) return { allowed: true };
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

// The client's address, from x-forwarded-for, the only place the app can see it. Next.js fills that
// header from the real connection ONLY when the client did not send it (server/base-server.js, the
// `??=` line), so on a direct connection a client can set it to anything. The LAST value is used,
// because that is the one a single trusted proxy would append. This is the weakness shown in
// evidence/14-rate-limit-defeated.txt.
export function clientAddress(request: Request): string {
  const parts = (request.headers.get("x-forwarded-for") ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  return (parts[parts.length - 1] ?? "unknown").slice(0, 64);
}

// The email is counted the same way whether or not an account exists, so the limit can never reveal
// which emails are registered. It is normalised like the stored email, so Ada@x.com and ada@x.com
// share one counter.
export function emailKey(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  return raw.trim().toLowerCase().slice(0, 254);
}

const REFUSED = "Too many attempts. Please try again later.";
const UNAVAILABLE = "Please try again later.";

function tooManyRequests(request: Request, started: number, retryAfterSeconds: number) {
  // 429, not 403: the request is fine, there are just too many. The same message whichever counter
  // was hit, so it does not say whether it was the address or the email.
  return respond(request, started, 429, { error: REFUSED }, { "Retry-After": String(retryAfterSeconds) });
}

// FAIL CLOSED: if the limiter itself breaks, the request is refused with 503. Letting it through
// would remove the protection exactly when something is wrong.
function limiterFailed(request: Request, started: number, error: unknown) {
  console.error("Rate limiter failed:", error instanceof Error ? error.name : "unknown error");
  return respond(request, started, 503, { error: UNAVAILABLE }, { "Retry-After": "60" });
}

export type Scope = "login" | "reset" | "register";

export function guardAddress(request: Request, started: number, scope: Scope, store: RateStore = defaultStore) {
  try {
    const decision = consume(store, `${scope}:address:${clientAddress(request)}`, ADDRESS_LIMITS[scope]);
    return decision.allowed ? null : tooManyRequests(request, started, decision.retryAfterSeconds);
  } catch (error) {
    return limiterFailed(request, started, error);
  }
}

export function guardEmail(
  request: Request,
  started: number,
  scope: "login" | "reset",
  rawEmail: unknown,
  store: RateStore = defaultStore,
) {
  const key = emailKey(rawEmail);
  if (key === null) return null; // nothing to count; a request without an email fails validation anyway
  try {
    const decision = consume(store, `${scope}:email:${key}`, EMAIL_LIMITS[scope]);
    return decision.allowed ? null : tooManyRequests(request, started, decision.retryAfterSeconds);
  } catch (error) {
    return limiterFailed(request, started, error);
  }
}
