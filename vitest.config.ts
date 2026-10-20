import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["packages/**/*.test.{ts,tsx}", "apps/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    // CSS imports are presentation assets; tests assert classes, not computed styles.
    css: false
  }
});
