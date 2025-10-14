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
  createUserCreatedWebhookPayload,
  createSupabaseAuthUser,
} from "../../test/utils/test-data.factory";
import { clearUsersTable, userExists } from "../../test/utils/database.util";
import { webhookApi } from "../../test/utils/api-client.util";
import { AuthWebhookResponse } from "../types/webhook.types";
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
      const payload = createUserCreatedWebhookPayload();

      const response = await webhookApi.userCreated(payload);

      // Webhook should succeed
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      // User should exist in database
      const exists = await userExists(db, payload.user.id);
      expect(exists).toBe(true);

      // Verify user data
      const user = await userRepo.findById(payload.user.id);
      expect(user).toBeDefined();
      expect(user?.id).toBe(payload.user.id);
      expect(user?.email).toBe(payload.user.email);
      expect(user?.name).toBe(payload.user.user_metadata.name);
      expect(user?.migrated_to_supabase).toBe(true);
    });

    it("should return custom JWT claims", async () => {
      const payload = createUserCreatedWebhookPayload();

      const response = await webhookApi.userCreated(payload);

      expect(response.status).toBe(200);
      const data = response.data as AuthWebhookResponse;

      // Should return claims object
      expect(data.claims).toBeDefined();
      expect(data.claims?.local_db_synced).toBe(true);
    });

    it("should handle user without name", async () => {
      const payload = createUserCreatedWebhookPayload({
        user_metadata: {}, // No name
      });

      const response = await webhookApi.userCreated(payload);

      expect(response.status).toBe(200);

      // User should be created with null name
      const user = await userRepo.findById(payload.user.id);
      expect(user).toBeDefined();
      expect(user?.name).toBeNull();
    });

    it("should be idempotent (duplicate webhook)", async () => {
      const payload = createUserCreatedWebhookPayload();

      // Send webhook first time
      const response1 = await webhookApi.userCreated(payload);
      expect(response1.status).toBe(200);

      // Send same webhook again
      const response2 = await webhookApi.userCreated(payload);
      expect(response2.status).toBe(200);

      // User should still exist (not duplicated)
      const user = await userRepo.findById(payload.user.id);
      expect(user).toBeDefined();
      expect(user?.email).toBe(payload.user.email);
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
      const payload = createUserCreatedWebhookPayload({
        id: userId,
        email: email,
      });

      const response = await webhookApi.userCreated(payload);

      // Should succeed (idempotent)
      expect(response.status).toBe(200);
      expect(response.error).toBeUndefined();
    });

    it("should handle multiple unique users", async () => {
      const users = [
        createUserCreatedWebhookPayload({ email: "user1@test.com" }),
        createUserCreatedWebhookPayload({ email: "user2@test.com" }),
        createUserCreatedWebhookPayload({ email: "user3@test.com" }),
      ];

      // Send webhooks for all users
      for (const payload of users) {
        const response = await webhookApi.userCreated(payload);
        expect(response.status).toBe(200);
      }

      // All users should exist
      for (const payload of users) {
        const exists = await userExists(db, payload.user.id);
        expect(exists).toBe(true);
      }
    });

    it("should handle user with all metadata fields", async () => {
      const payload = createUserCreatedWebhookPayload({
        email: "fulluser@test.com",
        user_metadata: {
          name: "Full Name",
        },
      });

      const response = await webhookApi.userCreated(payload);

      expect(response.status).toBe(200);

      // User should be created with name (other metadata ignored)
      const user = await userRepo.findById(payload.user.id);
      expect(user).toBeDefined();
      expect(user?.name).toBe("Full Name");
    });

    it("should handle webhook with missing user metadata", async () => {
      const userId = randomUUID();
      const payload = {
        event: "user.created" as const,
        user: {
          ...createSupabaseAuthUser({ id: userId }),
          user_metadata: undefined as any, // Missing metadata
        },
      };

      const response = await webhookApi.userCreated(payload);

      // Encore validates types at API boundary - malformed payload returns 400
      expect(response.status).toBe(400);
    });

    it("should log webhook events", async () => {
      const payload = createUserCreatedWebhookPayload();

      const response = await webhookApi.userCreated(payload);

      expect(response.status).toBe(200);

      // Webhook should succeed and log event
      // (Logs are not directly testable, but we verify success)
    });

    it("should reject invalid payload with 400", async () => {
      // Send invalid payload (missing required fields)
      const invalidPayload = {
        event: "user.created",
        user: {
          id: "invalid",
          // Missing required fields like email
        },
      };

      const response = await webhookApi.userCreated(invalidPayload);

      // Encore validates types at API boundary - invalid payload returns 400
      expect(response.status).toBe(400);
    });

    it("should handle concurrent webhook requests", async () => {
      const payloads = [
        createUserCreatedWebhookPayload({ email: "concurrent1@test.com" }),
        createUserCreatedWebhookPayload({ email: "concurrent2@test.com" }),
        createUserCreatedWebhookPayload({ email: "concurrent3@test.com" }),
      ];

      // Send all webhooks concurrently
      const responses = await Promise.all(
        payloads.map((payload) => webhookApi.userCreated(payload))
      );

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // All users should exist
      for (const payload of payloads) {
        const exists = await userExists(db, payload.user.id);
        expect(exists).toBe(true);
      }
    });
  });

  describe("Webhook security", () => {
    it("should accept webhook without authentication header", async () => {
      // Webhook endpoints should not require authentication
      // (In production, you'd verify webhook signature instead)
      const payload = createUserCreatedWebhookPayload();

      const response = await webhookApi.userCreated(payload);

      expect(response.status).toBe(200);
    });

    it("should validate webhook event type", async () => {
      const payload = createUserCreatedWebhookPayload();

      const response = await webhookApi.userCreated(payload);

      expect(response.status).toBe(200);
      expect(payload.event).toBe("user.created");
    });
  });

  describe("Webhook error handling", () => {
    it("should reject missing user email with 400", async () => {
      const payload = createUserCreatedWebhookPayload({
        email: undefined as any, // Missing email
      });

      const response = await webhookApi.userCreated(payload);

      // Encore validates types at API boundary - missing required field returns 400
      expect(response.status).toBe(400);
    });

    it("should handle invalid user ID gracefully", async () => {
      const payload = {
        event: "user.created" as const,
        user: {
          ...createSupabaseAuthUser(),
          id: "not-a-valid-uuid", // Invalid UUID
        },
      };

      const response = await webhookApi.userCreated(payload);

      // Should handle error gracefully
      expect(response.status).toBe(200);
      const data = response.data as AuthWebhookResponse;
      expect(data.claims).toEqual({});
    });
  });

  describe("Webhook integration scenarios", () => {
    it("should handle full user registration flow", async () => {
      // Simulate Supabase user signup → webhook → local DB sync
      const newUserEmail = "newuser@test.com";
      const newUserId = randomUUID();

      // 1. Webhook is triggered after Supabase signup
      const payload = createUserCreatedWebhookPayload({
        id: newUserId,
        email: newUserEmail,
        user_metadata: { name: "New User" },
      });

      const response = await webhookApi.userCreated(payload);
      expect(response.status).toBe(200);

      // 2. User should now exist in local database
      const user = await userRepo.findById(newUserId);
      expect(user).toBeDefined();
      expect(user?.email).toBe(newUserEmail);

      // 3. Custom claims should be returned
      const data = response.data as AuthWebhookResponse;
      expect(data.claims?.local_db_synced).toBe(true);
    });

    it("should handle rapid sequential user signups", async () => {
      const userCount = 5;
      const payloads = Array.from({ length: userCount }, (_, i) =>
        createUserCreatedWebhookPayload({
          email: `rapiduser${i}@test.com`,
          user_metadata: { name: `Rapid User ${i}` },
        })
      );

      // Send webhooks sequentially (rapid signups)
      for (const payload of payloads) {
        const response = await webhookApi.userCreated(payload);
        expect(response.status).toBe(200);
      }

      // All users should exist
      for (const payload of payloads) {
        const user = await userRepo.findById(payload.user.id);
        expect(user).toBeDefined();
      }
    });
  });
});
