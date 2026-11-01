import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),
  DATABASE_URL: z.url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(604800),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment variables:",
    z.flattenError(result.error).fieldErrors,
  );
  process.exit(1);
}

export const env = result.data;
