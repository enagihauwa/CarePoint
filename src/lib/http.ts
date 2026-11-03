// Reads a JSON request body without trusting its size or shape.
export type BoundedJson =
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 413; error: string };

export async function readBoundedJson(request: Request, maxBytes: number): Promise<BoundedJson> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, error: "The request is too large." };
  }

  // The header can be missing or wrong, so the real size is checked after reading as well.
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, status: 413, error: "The request is too large." };
  }

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "The request was not valid JSON." };
  }
}
