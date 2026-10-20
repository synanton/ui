import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["packages/**/*.test.{ts,tsx}"],
    // CSS imports are presentation assets; tests assert classes, not computed styles.
    css: false
  }
});
