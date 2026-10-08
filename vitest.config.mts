import { defineConfig } from "vitest/config";
import path from "node:path";

const integration = process.env.VITEST_INTEGRATION === "1";

export default defineConfig({
  test: {
    include: integration ? ["tests/integration/**/*.test.ts"] : ["tests/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    alias: { "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts") },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
