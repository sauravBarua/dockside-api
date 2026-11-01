import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/constants.js";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_ACCESS_SECRET: "test-secret-test-secret-test-secret-123",
      JWT_EXPIRES_IN_SECONDS: "3600",
    },
  },
});
