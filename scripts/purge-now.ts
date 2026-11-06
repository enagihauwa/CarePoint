// Runs the nightly purge ONCE, right now, by hand: npm run purge-now
// It calls the same function the scheduled job calls, so what it does is exactly what the night run does.
// Only accounts whose 14-day grace period has already ended are touched.
import "./loadEnv"; // must stay the first import (see loadEnv.ts)
import { purgeDeletedAccounts } from "../src/jobs/purgeDeletedAccounts";
import { prisma } from "../src/lib/db";

purgeDeletedAccounts()
  .catch(() => { process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
