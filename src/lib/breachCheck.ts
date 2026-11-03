import { createHash } from "node:crypto";

// Breach check with the Have I Been Pwned "range" API (Task 4, step 9), used on REGISTRATION only.
//
// k-anonymity: the password is hashed with SHA-1 here, and ONLY THE FIRST 5 CHARACTERS of that hash
// are sent. The service returns every known breached hash that starts with those 5 characters
// (hundreds of them), and the remaining 35 characters are compared on this server. So neither the
// password nor its full hash ever leaves the machine. SHA-1 is used only because the service's
// list is made with it. It is not used to store anything.
export const BREACH_RANGE_URL = "https://api.pwnedpasswords.com/range/";

// Measured on the user's machine: about 0.9 to 1.0 seconds per call, 2.6 seconds on the first
// (cold) call. 4 seconds leaves room for one slow call without making a patient wait much longer.
export const BREACH_TIMEOUT_MS = 4000;

export type BreachResult =
  | { status: "breached"; count: number }
  | { status: "not_found" }
  // The service could not be asked (network error, timeout or a bad answer). See the caller for
  // what happens then.
  | { status: "unavailable" };

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export async function checkBreached(
  password: string,
  fetcher: FetchLike = fetch,
  timeoutMs: number = BREACH_TIMEOUT_MS,
): Promise<BreachResult> {
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await fetcher(`${BREACH_RANGE_URL}${prefix}`, {
      // Add-Padding makes every answer a similar size, so the size of the answer says nothing
      // about how many hashes share the prefix. Padded lines have a count of 0.
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return { status: "unavailable" };

    for (const line of (await response.text()).split("\n")) {
      const [candidate, count] = line.trim().split(":");
      if (candidate === suffix && Number(count) > 0) return { status: "breached", count: Number(count) };
    }
    return { status: "not_found" };
  } catch {
    // Never log the password, the hash or the prefix.
    return { status: "unavailable" };
  }
}
