/**
 * Global Test Setup for Vitest + Encore.ts
 *
 * This file is executed once before all tests run.
 * It sets up the test environment, configures global hooks,
 * and provides utilities for test database management.
 *
 * IMPORTANT: This file should NOT contain global mocks.
 * Individual test files should mock dependencies as needed using vi.mock()
 * at the top of each test file (before imports).
 *
 * Encore.ts Testing Best Practices:
 * - Always run tests via `encore test` (never direct vitest)
 * - Encore automatically provisions optimized test databases
 * - Use ~encore/clients for service-to-service calls
 * - Override auth via CallOpts when testing authenticated endpoints
 * - Mock external dependencies (APIs, etc.) in individual tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  // Test suite starting
  // Encore automatically provisions test databases with:
  // - fsync disabled for speed
  // - in-memory filesystem
  // - automatic migration application
  // No manual database setup needed
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(async () => {
  // Test suite completed
  // Encore handles test database cleanup automatically
});

/**
 * Setup before each test
 * Can be overridden in individual test files if needed
 */
beforeEach(async () => {
  // Individual tests can add their own beforeEach hooks
  // for test-specific setup (e.g., creating test users)
});

/**
 * Cleanup after each test
 * Can be overridden in individual test files if needed
 */
afterEach(async () => {
  // Individual tests can add their own afterEach hooks
  // for test-specific cleanup (e.g., deleting test data)
});

/**
 * Environment configuration for tests
 */
export const TEST_CONFIG = {
  // Supabase test project settings
  supabase: {
    url: "https://test.supabase.co", // Mock URL for testing
    projectId: "test-project-id",
  },

  // Test user defaults
  testUser: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "test@example.com",
    name: "Test User",
  },

  // JWT settings for test tokens
  jwt: {
    issuer: "https://test.supabase.co/auth/v1",
    audience: "authenticated",
    expiresIn: "1h",
  },
} as const;
