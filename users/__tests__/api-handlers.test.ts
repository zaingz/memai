/**
 * API Handler Tests
 *
 * Tests the business logic of API endpoints by calling handlers directly.
 * This avoids transaction isolation issues by using direct DB operations for setup.
 *
 * Architecture:
 * - Setup: Direct DB writes (userRepo.create)
 * - Test: Import and call API handler functions with mock auth
 * - No service-to-service calls, no transaction isolation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { APIError } from "encore.dev/api";
import { db } from "../db";
import { UserRepository } from "../repositories/user.repository";
import { createTestUser, TEST_USERS } from "../../test/utils/test-data.factory";
import { clearUsersTable } from "../../test/utils/database.util";
import * as usersTestClient from "../../encore.gen/internal/clients/users/endpoints_testing";
import { generateTestJWT } from "../../test/utils/jwt-generator.util";
import type { CallOpts } from "encore.dev/api";
import { decodeJwt } from "jose";

describe("API Handlers - Business Logic", () => {
  const userRepo = new UserRepository(db);

  beforeEach(async () => {
    await clearUsersTable(db);
  });

  afterEach(async () => {
    await clearUsersTable(db);
  });

  /**
   * Helper to create auth CallOpts from JWT token
   * This simulates the auth context without requiring service infrastructure
   */
  function createAuthOpts(token: string): CallOpts {
    const payload = decodeJwt(token);
    return {
      authData: {
        userID: payload.sub || "",
        email: (payload.email as string) || "",
      },
    };
  }

  describe("GET /users/me - Handler Logic", () => {
    it("should return user profile for authenticated user", async () => {
      // Setup: Create user via direct DB write (test fixture)
      const user = TEST_USERS.primary;
      await userRepo.create({
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
      });

      // Execute: Call handler with mock auth context
      const token = await generateTestJWT(user.id, user.email);
      const result = await usersTestClient.me(undefined, createAuthOpts(token));

      // Assert: Handler returns correct data
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
      expect(result.user.name).toBe(user.name);
      expect(result.user.migrated_to_supabase).toBe(true);
      expect(result.user.created_at).toBeDefined();
      expect(result.user.updated_at).toBeDefined();
    });

    it("should throw not_found error when user not found in database", async () => {
      // Execute: Call handler for non-existent user
      const nonExistentUserId = "99999999-9999-9999-9999-999999999999";
      const token = await generateTestJWT(
        nonExistentUserId,
        "nonexistent@test.com"
      );

      // Assert: Handler throws not_found error
      await expect(
        usersTestClient.me(undefined, createAuthOpts(token))
      ).rejects.toMatchObject({ code: "not_found" });
    });

    it("should handle user with null name", async () => {
      // Setup: Create user without name
      const user = createTestUser({ name: null });
      await userRepo.create({
        id: user.id,
        email: user.email,
        name: undefined,
      });

      // Execute: Call handler
      const token = await generateTestJWT(user.id, user.email);
      const result = await usersTestClient.me(undefined, createAuthOpts(token));

      // Assert: Name is null
      expect(result.user.name).toBeNull();
    });

    it("should not return password_hash field (SafeUser)", async () => {
      // Setup: Create user
      const user = TEST_USERS.primary;
      await userRepo.create({
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
      });

      // Execute: Call handler
      const token = await generateTestJWT(user.id, user.email);
      const result = await usersTestClient.me(undefined, createAuthOpts(token));

      // Assert: SafeUser doesn't include password_hash
      expect((result.user as any).password_hash).toBeUndefined();
    });
  });

  describe("PATCH /users/me - Handler Logic", () => {
    it("should update user name", async () => {
      // Setup: Create user with old name
      const user = createTestUser({ name: "Old Name" });
      await userRepo.create({
        id: user.id,
        email: user.email,
        name: "Old Name",
      });

      // Execute: Call handler to update name
      const token = await generateTestJWT(user.id, user.email);
      const result = await usersTestClient.updateProfile(
        { name: "New Name" },
        createAuthOpts(token)
      );

      // Assert: Name was updated
      expect(result.user.name).toBe("New Name");
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
    });

    it("should update name to null", async () => {
      // Setup: Create user with name
      const user = createTestUser({ name: "Has Name" });
      await userRepo.create({
        id: user.id,
        email: user.email,
        name: "Has Name",
      });

      // Execute: Call handler to set name to null
      const token = await generateTestJWT(user.id, user.email);
      const result = await usersTestClient.updateProfile(
        { name: null },
        createAuthOpts(token)
      );

      // Assert: Name is now null
      expect(result.user.name).toBeNull();
    });

    it("should throw invalid_argument error when no fields provided", async () => {
      // Setup: Create user
      const user = TEST_USERS.primary;
      await userRepo.create({
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
      });

      // Execute: Call handler with empty update
      const token = await generateTestJWT(user.id, user.email);

      // Assert: Handler throws invalid_argument error
      await expect(
        usersTestClient.updateProfile({}, createAuthOpts(token))
      ).rejects.toMatchObject({ code: "invalid_argument" });
    });

    it("should update updated_at timestamp", async () => {
      // Setup: Create user
      const user = TEST_USERS.primary;
      await userRepo.create({
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
      });

      // Get initial timestamp
      const created = await userRepo.findById(user.id);
      expect(created).toBeDefined();

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Execute: Call handler to update
      const token = await generateTestJWT(user.id, user.email);
      const result = await usersTestClient.updateProfile(
        { name: "Updated Name" },
        createAuthOpts(token)
      );

      // Assert: Timestamp was updated
      const updatedAt = new Date(result.user.updated_at);
      expect(updatedAt.getTime()).toBeGreaterThan(
        created!.updated_at.getTime()
      );
    });

    it("should only update authenticated user's data", async () => {
      // Setup: Create two users
      const user1 = createTestUser({
        email: "user1@test.com",
        name: "User 1",
      });
      const user2 = createTestUser({
        email: "user2@test.com",
        name: "User 2",
      });

      await userRepo.create({
        id: user1.id,
        email: user1.email,
        name: "User 1",
      });

      await userRepo.create({
        id: user2.id,
        email: user2.email,
        name: "User 2",
      });

      // Execute: User 1 updates their name
      const token1 = await generateTestJWT(user1.id, user1.email);
      const result = await usersTestClient.updateProfile(
        { name: "Updated User 1" },
        createAuthOpts(token1)
      );

      // Assert: User 1 was updated
      expect(result.user.name).toBe("Updated User 1");

      // Verify user 1 updated in DB
      const updatedUser1 = await userRepo.findById(user1.id);
      expect(updatedUser1?.name).toBe("Updated User 1");

      // Verify user 2 unchanged
      const unchangedUser2 = await userRepo.findById(user2.id);
      expect(unchangedUser2?.name).toBe("User 2");
    });

    it("should handle concurrent updates gracefully", async () => {
      // Setup: Create user
      const user = TEST_USERS.primary;
      await userRepo.create({
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
      });

      const token = await generateTestJWT(user.id, user.email);
      const authOpts = createAuthOpts(token);

      // Execute: Make two concurrent update requests
      const [result1, result2] = await Promise.all([
        usersTestClient.updateProfile({ name: "Update 1" }, authOpts),
        usersTestClient.updateProfile({ name: "Update 2" }, authOpts),
      ]);

      // Assert: Both requests succeeded and reflected requested names
      expect(result1.user.name).toBe("Update 1");
      expect(result2.user.name).toBe("Update 2");

      // Final state should be one of the two updates
      const finalUser = await userRepo.findById(user.id);
      expect(["Update 1", "Update 2"]).toContain(finalUser?.name);
    });

    it("should surface internal error when user missing during update", async () => {
      const user = TEST_USERS.primary;
      const token = await generateTestJWT(user.id, user.email);

      await expect(
        usersTestClient.updateProfile({ name: "Does Not Matter" }, createAuthOpts(token))
      ).rejects.toMatchObject({ code: "internal" });
    });
  });

  describe("Error Handling", () => {
    it("should return proper error format", async () => {
      // Execute: Call handler for non-existent user
      const nonExistentUserId = "99999999-9999-9999-9999-999999999999";
      const token = await generateTestJWT(
        nonExistentUserId,
        "nonexistent@test.com"
      );

      // Assert: Error has proper structure
      try {
        await usersTestClient.me(undefined, createAuthOpts(token));
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe("not_found");
        expect(error.message).toBeDefined();
      }
    });

    it("should include helpful error messages", async () => {
      // Setup: Create user
      const user = TEST_USERS.primary;
      await userRepo.create({
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
      });

      // Execute: Call handler with invalid update (no fields)
      const token = await generateTestJWT(user.id, user.email);

      // Assert: Error message is helpful
      try {
        await usersTestClient.updateProfile({}, createAuthOpts(token));
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).toBe("invalid_argument");
        expect(error.message).toMatch(/field/i);
      }
    });
  });

  describe("Cross-user Isolation", () => {
    it("should not allow accessing other user's data", async () => {
      // Setup: Create two users
      const user1 = createTestUser({ email: "user1@test.com" });
      const user2 = createTestUser({ email: "user2@test.com" });

      await userRepo.create({
        id: user1.id,
        email: user1.email,
        name: user1.name ?? undefined,
      });

      await userRepo.create({
        id: user2.id,
        email: user2.email,
        name: user2.name ?? undefined,
      });

      // Execute: User 1 accesses their data
      const token1 = await generateTestJWT(user1.id, user1.email);
      const result1 = await usersTestClient.me(
        undefined,
        createAuthOpts(token1)
      );

      // Assert: User 1 gets their own data
      expect(result1.user.id).toBe(user1.id);

      // Execute: User 2 accesses their data
      const token2 = await generateTestJWT(user2.id, user2.email);
      const result2 = await usersTestClient.me(
        undefined,
        createAuthOpts(token2)
      );

      // Assert: User 2 gets their own data
      expect(result2.user.id).toBe(user2.id);

      // Verify data is different
      expect(result1.user.id).not.toBe(result2.user.id);
      expect(result1.user.email).not.toBe(result2.user.email);
    });
  });
});
