import { NextResponse } from "next/server";

// One log line per request: method, path, status and time taken. Shared by the API routes.
// Never log the body or the headers: they can hold a password or an email address.
export function respond(
  request: Request,
  started: number,
  status: number,
  body: unknown,
  headers?: Record<string, string>,
) {
  const ms = Math.round(performance.now() - started);
  console.log(`${request.method} ${new URL(request.url).pathname} ${status} ${ms}ms`);
  return NextResponse.json(body, { status, headers });
}
