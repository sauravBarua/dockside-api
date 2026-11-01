import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // No .env file (CI or Docker): variables come from the environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
