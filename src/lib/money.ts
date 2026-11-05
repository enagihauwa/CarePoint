// Money is stored as whole kobo (an integer), never as a decimal: decimals drift (0.1 + 0.2). The front desk types
// naira, with up to two decimal places, and this turns it into kobo using string work only, no floating point.

// Technical ceiling, NOT a business rule: a PostgreSQL Int holds up to 2,147,483,647, so keep well under it.
// It is 2,000,000,000 kobo, which is 20,000,000 naira. Nothing at the clinic costs that much.
export const MAX_KOBO = 2_000_000_000;

// "12500" -> 1250000, "12500.5" -> 1250050, "12500.50" -> 1250050. Anything else (empty, negative, letters,
// three decimals, 0) gives null.
export function nairaToKobo(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const kobo = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0") || "0");
  return kobo > 0 && kobo <= MAX_KOBO ? kobo : null;
}

export function formatNaira(kobo: number): string {
  return (kobo / 100).toLocaleString("en-NG", { style: "currency", currency: "NGN" });
}
