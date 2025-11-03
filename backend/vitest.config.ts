/// <reference types="vitest" />
import { defineConfig } from "vite";
import path from "path";

/**
 * Vitest Configuration for Encore.ts Backend
 *
 * Key settings for Encore.ts integration:
 * - fileParallelism: false - Required for database tests (Encore manages test DB)
 * - ~encore alias resolution for service imports
 * - Node environment for backend testing
 * - Global test setup file
 */
export default defineConfig({
  resolve: {
    alias: {
      // Encore generates types and clients in encore.gen directory
      "~encore": path.resolve(__dirname, "./encore.gen"),
    },
  },
  test: {
    // Disable file parallelism for database tests (Encore best practice)
    // Can be re-enabled in CI with: encore test --fileParallelism=true
    fileParallelism: false,

    // Node environment for backend testing
    environment: "node",

    // Enable globals for convenient test writing (describe, it, expect, etc.)
    globals: true,

    // Global setup file for test initialization
    setupFiles: ["./test/setup.ts"],

    // Test timeout (30 seconds for integration tests)
    testTimeout: 30000,

    // Hook timeout
    hookTimeout: 10000,
  },
});
