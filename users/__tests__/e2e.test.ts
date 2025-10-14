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
import { generateTestJWT } from "../../test/utils/jwt-generator.util";
import { createUserCreatedWebhookPayload } from "../../test/utils/test-data.factory";
import { clearUsersTable, userExists } from "../../test/utils/database.util";
import { userApi, webhookApi } from "../../test/utils/api-client.util";
import { MeResponse, UpdateProfileResponse } from "../types/api.types";
import { randomUUID } from "crypto";

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
      const webhookPayload = createUserCreatedWebhookPayload({
        id: userId,
        email: userEmail,
        user_metadata: { name: userName },
      });

      const webhookResponse = await webhookApi.userCreated(webhookPayload);
      expect(webhookResponse.status).toBe(200);

      // STEP 2: Verify user exists in local database
      const exists = await userExists(db, userId);
      expect(exists).toBe(true);

      // STEP 3: User fetches their profile (simulates login → API call)
      const token = await generateTestJWT(userId, userEmail);
      const profileResponse = await userApi.getMe(token);
      expect(profileResponse.status).toBe(200);

      const { user } = profileResponse.data as MeResponse;
      expect(user.id).toBe(userId);
      expect(user.email).toBe(userEmail);
      expect(user.name).toBe(userName);

      // STEP 4: User updates their profile
      const updatedName = "Updated Name";
      const updateResponse = await userApi.updateMe(
        { name: updatedName },
        token
      );
      expect(updateResponse.status).toBe(200);

      const { user: updatedUser } = updateResponse.data as UpdateProfileResponse;
      expect(updatedUser.name).toBe(updatedName);

      // STEP 5: Verify update persisted
      const verifyResponse = await userApi.getMe(token);
      const { user: verifiedUser } = verifyResponse.data as MeResponse;
      expect(verifiedUser.name).toBe(updatedName);
    });
  });

  describe("Webhook Idempotency", () => {
    it("should handle duplicate webhook deliveries (retry scenario)", async () => {
      const userId = randomUUID();
      const userEmail = "idempotent@test.com";

      const payload = createUserCreatedWebhookPayload({
        id: userId,
        email: userEmail,
        user_metadata: { name: "Idempotent User" },
      });

      // Send webhook 3 times (simulating Supabase retries)
      const response1 = await webhookApi.userCreated(payload);
      const response2 = await webhookApi.userCreated(payload);
      const response3 = await webhookApi.userCreated(payload);

      // All should succeed
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);

      // User should exist only once
      const user = await userRepo.findById(userId);
      expect(user).toBeDefined();

      // Should be able to access profile normally
      const token = await generateTestJWT(userId, userEmail);
      const profileResponse = await userApi.getMe(token);
      expect(profileResponse.status).toBe(200);
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
        const payload = createUserCreatedWebhookPayload({
          id: user.id,
          email: user.email,
          user_metadata: { name: user.name },
        });
        await webhookApi.userCreated(payload);
      }

      // User 1 updates their profile
      const token1 = await generateTestJWT(user1.id, user1.email);
      await userApi.updateMe({ name: "User 1 Updated" }, token1);

      // User 2 fetches their profile
      const token2 = await generateTestJWT(user2.id, user2.email);
      const response2 = await userApi.getMe(token2);

      const { user: userData2 } = response2.data as MeResponse;

      // User 2's data should be unchanged
      expect(userData2.id).toBe(user2.id);
      expect(userData2.name).toBe("User 2"); // Not affected by user 1's update
    });
  });

  describe("Authentication Failures", () => {
    it("should reject unauthenticated requests", async () => {
      // Try to fetch profile without token
      const profileResponse = await userApi.getMe("");
      expect(profileResponse.status).toBe(401);
      expect(profileResponse.error?.code).toBe("unauthenticated");

      // Try to update profile without token
      const updateResponse = await userApi.updateMe({ name: "Hacker" }, "");
      expect(updateResponse.status).toBe(401);
      expect(updateResponse.error?.code).toBe("unauthenticated");
    });

    it("should reject access for non-existent user", async () => {
      const nonExistentUserId = randomUUID();
      const token = await generateTestJWT(
        nonExistentUserId,
        "nonexistent@test.com"
      );

      // Try to fetch profile
      const response = await userApi.getMe(token);
      expect(response.status).toBe(404);
      expect(response.error?.code).toBe("not_found");
    });
  });
});
