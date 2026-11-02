import { defineConfig, env } from "prisma/config";

// The Prisma CLI does not read .env by itself, so load it here. Next.js loads .env for the app.
try {
  process.loadEnvFile();
} catch {
  // No .env file: DATABASE_URL must already be set in the environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DATABASE_URL") },
});
