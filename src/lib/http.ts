// Reads a JSON request body without trusting its size or shape.
export type BoundedJson =
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 413; error: string };

const tooLarge = (): BoundedJson => ({ ok: false, status: 413, error: "The request is too large." });

export async function readBoundedJson(request: Request, maxBytes: number): Promise<BoundedJson> {
  // A client can leave Content-Length out or lie about it, so this is only a quick first check.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge();

  // The real check: read the body in pieces and stop as soon as it passes the limit, so a huge
  // body is never held in memory in full.
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return tooLarge();
      }
      chunks.push(value);
    }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 400, error: "The request was not valid JSON." };
  }
}
