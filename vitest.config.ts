import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts, whose dev plugins boot the API and connect to MongoDB.
export default defineConfig({
  test: {
    include: ["server/**/*.test.ts", "shared/**/*.test.ts", "client/src/**/*.test.ts"],
    environment: "node",
  },
});
