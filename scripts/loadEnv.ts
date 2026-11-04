// Import this FIRST in any script that touches the database. Imports run in order, before the rest of the
// script, so putting the loader in the script's own body runs it too late: the database client has already
// read DATABASE_URL (and found nothing) by then. That mistake made the worker connect as the Windows user
// "USER" instead of "postgres" (jobs failed with P1010, see docs/verification-design.md).
try {
  process.loadEnvFile();
} catch {
  // No .env file: the variables must already be set in the environment.
}
