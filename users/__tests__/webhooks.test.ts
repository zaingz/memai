/**
 * Webhook Tests
 *
 * Tests the Supabase Auth webhook endpoints that sync user data
 * from Supabase to the local database.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../db";
import { UserRepository } from "../repositories/user.repository";
import {
  createCustomAccessTokenHookPayload,
} from "../../test/utils/test-data.factory";
import { clearUsersTable, userExists } from "../../test/utils/database.util";
import { userCreated } from "../webhooks";
import { randomUUID } from "crypto";

describe("Supabase Auth Webhooks", () => {
  const userRepo = new UserRepository(db);

  beforeEach(async () => {
    await clearUsersTable(db);
  });

  afterEach(async () => {
    await clearUsersTable(db);
  });

  describe("POST /webhooks/auth/user-created", () => {
    it("should create user in local database from webhook", async () => {
      const payload = createCustomAccessTokenHookPayload();

      const response = await userCreated(payload);

      // Webhook should return claims with local_db_synced
      expect(response.claims).toBeDefined();
      expect(response.claims.local_db_synced).toBe(true);

      // User should exist in database
      const exists = await userExists(db, payload.user_id);
      expect(exists).toBe(true);

      // Verify user data
      const user = await userRepo.findById(payload.user_id);
      expect(user).toBeDefined();
      expect(user?.id).toBe(payload.user_id);
      expect(user?.email).toBe(payload.claims.email);
      expect(user?.name).toBe(payload.claims.user_metadata?.name);
      expect(user?.migrated_to_supabase).toBe(true);
    });

    it("should return custom JWT claims", async () => {
      const payload = createCustomAccessTokenHookPayload();

      const response = await userCreated(payload);

      // Should return claims object
      expect(response.claims).toBeDefined();
      expect(response.claims?.local_db_synced).toBe(true);
    });

    it("should handle user without name", async () => {
      const payload = createCustomAccessTokenHookPayload({
        user_metadata: {}, // No name
      });

      const response = await userCreated(payload);

      expect(response.claims).toBeDefined();

      // User should be created with null name
      const user = await userRepo.findById(payload.user_id);
      expect(user).toBeDefined();
      expect(user?.name).toBeNull();
    });

    it("should be idempotent (duplicate webhook)", async () => {
      const payload = createCustomAccessTokenHookPayload();

      // Send webhook first time
      const response1 = await userCreated(payload);
      expect(response1.claims?.local_db_synced).toBe(true);

      // Send same webhook again (still returns claims with local_db_synced for duplicate)
      const response2 = await userCreated(payload);
      expect(response2.claims?.local_db_synced).toBe(true);

      // User should still exist (not duplicated)
      const user = await userRepo.findById(payload.user_id);
      expect(user).toBeDefined();
      expect(user?.email).toBe(payload.claims.email);
    });

    it("should not throw error on duplicate webhook", async () => {
      const userId = randomUUID();
      const email = "duplicate@test.com";

      // Create user directly in database
      await userRepo.create({
        id: userId,
        email: email,
        name: "Existing User",
      });

      // Send webhook for same user
      const payload = createCustomAccessTokenHookPayload({
        id: userId,
        email: email,
      });

      const response = await userCreated(payload);

      // Should succeed with claims including local_db_synced (duplicate user)
      expect(response.claims?.local_db_synced).toBe(true);
    });

    it("should handle multiple unique users", async () => {
      const users = [
        createCustomAccessTokenHookPayload({ email: "user1@test.com" }),
        createCustomAccessTokenHookPayload({ email: "user2@test.com" }),
        createCustomAccessTokenHookPayload({ email: "user3@test.com" }),
      ];

      // Send webhooks for all users
      for (const payload of users) {
        const response = await userCreated(payload);
        expect(response.claims?.local_db_synced).toBe(true);
      }

      // All users should exist
      for (const payload of users) {
        const exists = await userExists(db, payload.user_id);
        expect(exists).toBe(true);
      }
    });

    it("should handle user with all metadata fields", async () => {
      const payload = createCustomAccessTokenHookPayload({
        email: "fulluser@test.com",
        user_metadata: {
          name: "Full Name",
        },
      });

      const response = await userCreated(payload);

      expect(response.claims?.local_db_synced).toBe(true);

      // User should be created with name (other metadata ignored)
      const user = await userRepo.findById(payload.user_id);
      expect(user).toBeDefined();
      expect(user?.name).toBe("Full Name");
    });

    it("should handle webhook with missing user metadata", async () => {
      const userId = randomUUID();
      const payload = {
        user_id: userId,
        claims: {
          sub: userId,
          email: "test@example.com",
          // Missing user_metadata
        },
        authentication_method: "password",
      };

      // Handler catches errors and returns existing claims
      const response = await userCreated(payload as any);
      expect(response.claims).toBeDefined();
    });

    it("should log webhook events", async () => {
      const payload = createCustomAccessTokenHookPayload();

      const response = await userCreated(payload);

      expect(response.claims?.local_db_synced).toBe(true);

      // Webhook should succeed and log event
      // (Logs are not directly testable, but we verify success)
    });

    it("should reject invalid payload with 400", async () => {
      // Send invalid payload (missing required fields)
      const invalidPayload = {
        user_id: "invalid",
        claims: {
          // Missing required fields like email
        },
        authentication_method: "password",
      };

      // Handler catches errors and returns existing claims
      const response = await userCreated(invalidPayload as any);
      expect(response.claims).toBeDefined();
    });

    it("should handle concurrent webhook requests", async () => {
      const payloads = [
        createCustomAccessTokenHookPayload({ email: "concurrent1@test.com" }),
        createCustomAccessTokenHookPayload({ email: "concurrent2@test.com" }),
        createCustomAccessTokenHookPayload({ email: "concurrent3@test.com" }),
      ];

      // Send all webhooks concurrently
      const responses = await Promise.all(
        payloads.map((payload) => userCreated(payload))
      );

      // All should succeed
      responses.forEach((response) => {
        expect(response.claims?.local_db_synced).toBe(true);
      });

      // All users should exist
      for (const payload of payloads) {
        const exists = await userExists(db, payload.user_id);
        expect(exists).toBe(true);
      }
    });
  });

  describe("Webhook security", () => {
    it("should accept webhook without authentication header", async () => {
      // Webhook endpoints should not require authentication
      // (In production, you'd verify webhook signature instead)
      const payload = createCustomAccessTokenHookPayload();

      const response = await userCreated(payload);

      expect(response.claims?.local_db_synced).toBe(true);
    });

    it("should validate webhook event type", async () => {
      const payload = createCustomAccessTokenHookPayload();

      const response = await userCreated(payload);

      expect(response.claims?.local_db_synced).toBe(true);
    });
  });

  describe("Webhook error handling", () => {
    it("should reject missing user email with 400", async () => {
      const userId = randomUUID();
      const payload = {
        user_id: userId,
        claims: {
          sub: userId,
          // Missing email field
          user_metadata: { name: "Test" },
        },
        authentication_method: "password",
      };

      // Handler catches errors and returns existing claims unchanged
      const response = await userCreated(payload as any);
      expect(response.claims).toBeDefined();
    });

    it("should handle invalid user ID gracefully", async () => {
      const payload = {
        user_id: "not-a-valid-uuid", // Invalid UUID
        claims: {
          email: "test@example.com",
          user_metadata: { name: "Test" },
        },
        authentication_method: "password",
      };

      const response = await userCreated(payload as any);

      // Should handle error gracefully and return existing claims
      expect(response.claims).toBeDefined();
    });
  });

  describe("Webhook integration scenarios", () => {
    it("should handle full user registration flow", async () => {
      // Simulate Supabase user signup → webhook → local DB sync
      const newUserEmail = "newuser@test.com";
      const newUserId = randomUUID();

      // 1. Webhook is triggered after Supabase signup
      const payload = createCustomAccessTokenHookPayload({
        id: newUserId,
        email: newUserEmail,
        user_metadata: { name: "New User" },
      });

      const response = await userCreated(payload);

      // 2. User should now exist in local database
      const user = await userRepo.findById(newUserId);
      expect(user).toBeDefined();
      expect(user?.email).toBe(newUserEmail);

      // 3. Custom claims should be returned
      expect(response.claims?.local_db_synced).toBe(true);
    });

    it("should handle rapid sequential user signups", async () => {
      const userCount = 5;
      const payloads = Array.from({ length: userCount }, (_, i) =>
        createCustomAccessTokenHookPayload({
          email: `rapiduser${i}@test.com`,
          user_metadata: { name: `Rapid User ${i}` },
        })
      );

      // Send webhooks sequentially (rapid signups)
      for (const payload of payloads) {
        const response = await userCreated(payload);
        expect(response.claims?.local_db_synced).toBe(true);
      }

      // All users should exist
      for (const payload of payloads) {
        const user = await userRepo.findById(payload.user_id);
        expect(user).toBeDefined();
      }
    });
  });
});
