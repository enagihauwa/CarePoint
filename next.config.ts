import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // EXPERIMENTAL in this version of Next.js, and switched on on purpose: it is what lets the admin page answer
  // with a real HTTP 403 (forbidden()) instead of a page that says "no" with a 200. If a later version changes or
  // removes it, the admin page's 403 check (task-05-sessions-compliance-defence/evidence/16a) will fail.
  experimental: { authInterrupts: true },
};

export default nextConfig;
