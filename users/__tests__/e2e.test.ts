/**
 * End-to-End Tests - Critical User Journeys
 *
 * Tests complete user flows from signup (via webhook) through API usage.
 * These tests validate the full integration between Supabase Auth and our API.
 *
 * Focus: Only critical production flows, not exhaustive scenarios
 * Setup: Uses webhook endpoint to simulate Supabase user creation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../db";
import { UserRepository } from "../repositories/user.repository";
import { createCustomAccessTokenHookPayload } from "../../test/utils/test-data.factory";
import { clearUsersTable, userExists } from "../../test/utils/database.util";
import { createAuthOpts } from "../../test/utils/api-test.factory";
import { userCreated } from "../webhooks";
import { randomUUID } from "crypto";
import { APIError } from "encore.dev/api";
import * as usersTestClient from "~encore/internal/clients/users/endpoints_testing";

describe("E2E: Critical User Journeys", () => {
  const userRepo = new UserRepository(db);

  beforeEach(async () => {
    await clearUsersTable(db);
  });

  afterEach(async () => {
    await clearUsersTable(db);
  });

  describe("Complete User Lifecycle", () => {
    it("should handle user signup → profile fetch → profile update flow", async () => {
      const userId = randomUUID();
      const userEmail = "newuser@test.com";
      const userName = "New User";

      // STEP 1: Simulate Supabase user creation webhook
      const webhookPayload = createCustomAccessTokenHookPayload({
        id: userId,
        email: userEmail,
        user_metadata: { name: userName },
      });

      const webhookResponse = await userCreated(webhookPayload);
      expect(webhookResponse.claims).toBeDefined();

      // STEP 2: Verify user exists in local database
      const exists = await userExists(db, userId);
      expect(exists).toBe(true);

      // STEP 3: User fetches their profile (simulates login → API call)
      const profileResponse = await usersTestClient.me(undefined, createAuthOpts(userId, userEmail));

      expect(profileResponse.user.id).toBe(userId);
      expect(profileResponse.user.email).toBe(userEmail);
      expect(profileResponse.user.name).toBe(userName);

      // STEP 4: User updates their profile
      const updatedName = "Updated Name";
      const updateResponse = await usersTestClient.updateProfile(
        { name: updatedName },
        createAuthOpts(userId, userEmail)
      );

      expect(updateResponse.user.name).toBe(updatedName);

      // STEP 5: Verify update persisted
      const verifyResponse = await usersTestClient.me(undefined, createAuthOpts(userId, userEmail));
      expect(verifyResponse.user.name).toBe(updatedName);
    });
  });

  describe("Webhook Idempotency", () => {
    it("should handle duplicate webhook deliveries (retry scenario)", async () => {
      const userId = randomUUID();
      const userEmail = "idempotent@test.com";

      const payload = createCustomAccessTokenHookPayload({
        id: userId,
        email: userEmail,
        user_metadata: { name: "Idempotent User" },
      });

      // Send webhook 3 times (simulating Supabase retries)
      const response1 = await userCreated(payload);
      const response2 = await userCreated(payload);
      const response3 = await userCreated(payload);

      // All should succeed
      expect(response1.claims).toBeDefined();
      expect(response2.claims).toBeDefined();
      expect(response3.claims).toBeDefined();

      // User should exist only once
      const user = await userRepo.findById(userId);
      expect(user).toBeDefined();

      // Should be able to access profile normally
      const profileResponse = await usersTestClient.me(undefined, createAuthOpts(userId, userEmail));
      expect(profileResponse.user).toBeDefined();
    });
  });

  describe("Multi-user Isolation", () => {
    it("should maintain data isolation between users", async () => {
      // Create two users via webhooks
      const user1 = {
        id: randomUUID(),
        email: "user1@test.com",
        name: "User 1",
      };
      const user2 = {
        id: randomUUID(),
        email: "user2@test.com",
        name: "User 2",
      };

      for (const user of [user1, user2]) {
        const payload = createCustomAccessTokenHookPayload({
          id: user.id,
          email: user.email,
          user_metadata: { name: user.name },
        });
        await userCreated(payload);
      }

      // User 1 updates their profile
      await usersTestClient.updateProfile({ name: "User 1 Updated" }, createAuthOpts(user1.id, user1.email));

      // User 2 fetches their profile
      const response2 = await usersTestClient.me(undefined, createAuthOpts(user2.id, user2.email));

      const userData2 = response2.user;

      // User 2's data should be unchanged
      expect(userData2.id).toBe(user2.id);
      expect(userData2.name).toBe("User 2"); // Not affected by user 1's update
    });
  });

  describe("Authentication Failures", () => {
    it("should reject unauthenticated requests", async () => {
      // Try to fetch profile without token
      try {
        await usersTestClient.me(undefined, undefined);
        throw new Error("Should have thrown unauthenticated error");
      } catch (error: any) {
        expect(error.code).toBe("unauthenticated");
      }

      // Try to update profile without token
      try {
        await usersTestClient.updateProfile({ name: "Hacker" }, undefined);
        throw new Error("Should have thrown unauthenticated error");
      } catch (error: any) {
        expect(error.code).toBe("unauthenticated");
      }
    });

    it("should reject access for non-existent user", async () => {
      const nonExistentUserId = randomUUID();
      const nonExistentEmail = "nonexistent@test.com";

      // Try to fetch profile
      try {
        await usersTestClient.me(undefined, createAuthOpts(nonExistentUserId, nonExistentEmail));
        throw new Error("Should have thrown not_found error");
      } catch (error: any) {
        expect(error.code).toBe("not_found");
      }
    });
  });
});
