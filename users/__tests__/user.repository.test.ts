/**
 * User Repository Tests
 *
 * Tests the UserRepository class for database operations.
 * These are integration tests that use a real test database
 * provisioned automatically by Encore.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../db";
import { UserRepository } from "../repositories/user.repository";
import { createTestUser, TEST_USERS, toUserCreateData } from "../../test/utils/test-data.factory";
import { clearUsersTable, countUsers } from "../../test/utils/database.util";
import { randomUUID } from "crypto";

describe("UserRepository", () => {
  const userRepo = new UserRepository(db);

  // Clean up database before and after each test
  beforeEach(async () => {
    await clearUsersTable(db);
  });

  afterEach(async () => {
    await clearUsersTable(db);
  });

  describe("create", () => {
    it("should create a new user with valid data", async () => {
      const userData = {
        id: randomUUID(),
        email: "newuser@test.com",
        name: "New User",
      };

      const user = await userRepo.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBe(userData.id);
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.migrated_to_supabase).toBe(true);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });

    it("should create a user without a name", async () => {
      const userData = {
        id: randomUUID(),
        email: "noname@test.com",
      };

      const user = await userRepo.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBe(userData.id);
      expect(user.email).toBe(userData.email);
      expect(user.name).toBeNull();
    });

    it("should throw error when creating user with duplicate id", async () => {
      const userData = {
        id: randomUUID(),
        email: "duplicate-id@test.com",
        name: "Duplicate ID User",
      };

      // Create first user
      await userRepo.create(userData);

      // Attempt to create user with same ID
      await expect(
        userRepo.create({
          ...userData,
          email: "different@test.com", // Different email, same ID
        })
      ).rejects.toThrow();
    });

    it("should throw error when creating user with duplicate email", async () => {
      const email = "duplicate@test.com";

      // Create first user
      await userRepo.create({
        id: randomUUID(),
        email: email,
        name: "First User",
      });

      // Attempt to create user with same email
      await expect(
        userRepo.create({
          id: randomUUID(), // Different ID, same email
          email: email,
          name: "Second User",
        })
      ).rejects.toThrow();
    });
  });

  describe("findById", () => {
    it("should find existing user by ID", async () => {
      const userData = createTestUser();
      await userRepo.create(toUserCreateData(userData));

      const found = await userRepo.findById(userData.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(userData.id);
      expect(found?.email).toBe(userData.email);
      expect(found?.name).toBe(userData.name);
    });

    it("should return null for non-existent user", async () => {
      const nonExistentId = randomUUID();
      const found = await userRepo.findById(nonExistentId);

      expect(found).toBeNull();
    });

    it("should find user with null name", async () => {
      const userData = createTestUser({ name: null });
      await userRepo.create(toUserCreateData(userData));

      const found = await userRepo.findById(userData.id);

      expect(found).toBeDefined();
      expect(found?.name).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should find existing user by email", async () => {
      const userData = createTestUser();
      await userRepo.create(toUserCreateData(userData));

      const found = await userRepo.findByEmail(userData.email);

      expect(found).toBeDefined();
      expect(found?.id).toBe(userData.id);
      expect(found?.email).toBe(userData.email);
    });

    it("should return null for non-existent email", async () => {
      const found = await userRepo.findByEmail("nonexistent@test.com");

      expect(found).toBeNull();
    });

    it("should be case-sensitive", async () => {
      const userData = createTestUser({ email: "TestUser@example.com" });
      await userRepo.create(toUserCreateData(userData));

      // Exact match should work
      const found = await userRepo.findByEmail("TestUser@example.com");
      expect(found).toBeDefined();

      // Different case should not work
      const notFound = await userRepo.findByEmail("testuser@example.com");
      expect(notFound).toBeNull();
    });
  });

  describe("findBySupabaseId", () => {
    it("should be an alias for findById", async () => {
      const userData = createTestUser();
      await userRepo.create(toUserCreateData(userData));

      const foundById = await userRepo.findById(userData.id);
      const foundBySupabaseId = await userRepo.findBySupabaseId(userData.id);

      expect(foundById).toEqual(foundBySupabaseId);
    });
  });

  describe("existsByEmail", () => {
    it("should return true for existing email", async () => {
      const userData = createTestUser();
      await userRepo.create(toUserCreateData(userData));

      const exists = await userRepo.existsByEmail(userData.email);

      expect(exists).toBe(true);
    });

    it("should return false for non-existent email", async () => {
      const exists = await userRepo.existsByEmail("nonexistent@test.com");

      expect(exists).toBe(false);
    });
  });

  describe("existsById", () => {
    it("should return true for existing user ID", async () => {
      const userData = createTestUser();
      await userRepo.create(toUserCreateData(userData));

      const exists = await userRepo.existsById(userData.id);

      expect(exists).toBe(true);
    });

    it("should return false for non-existent user ID", async () => {
      const nonExistentId = randomUUID();
      const exists = await userRepo.existsById(nonExistentId);

      expect(exists).toBe(false);
    });
  });

  describe("update", () => {
    it("should update user name", async () => {
      const userData = createTestUser({ name: "Old Name" });
      await userRepo.create(toUserCreateData(userData));

      const updated = await userRepo.update(userData.id, { name: "New Name" });

      expect(updated.name).toBe("New Name");
      expect(updated.email).toBe(userData.email);
      expect(updated.id).toBe(userData.id);
    });

    it("should update user email", async () => {
      const userData = createTestUser();
      await userRepo.create(toUserCreateData(userData));

      const newEmail = "newemail@test.com";
      const updated = await userRepo.update(userData.id, { email: newEmail });

      expect(updated.email).toBe(newEmail);
      expect(updated.id).toBe(userData.id);
    });

    it("should update both name and email", async () => {
      const userData = createTestUser();
      await userRepo.create(toUserCreateData(userData));

      const newName = "New Name";
      const newEmail = "newemail@test.com";
      const updated = await userRepo.update(userData.id, {
        name: newName,
        email: newEmail,
      });

      expect(updated.name).toBe(newName);
      expect(updated.email).toBe(newEmail);
    });

    it("should update name to null", async () => {
      const userData = createTestUser({ name: "Has Name" });
      await userRepo.create(toUserCreateData(userData));

      const updated = await userRepo.update(userData.id, { name: null as any });

      expect(updated.name).toBeNull();
    });

    it("should throw error when updating non-existent user", async () => {
      const nonExistentId = randomUUID();

      await expect(
        userRepo.update(nonExistentId, { name: "New Name" })
      ).rejects.toThrow(/not found/i);
    });

    it("should throw error when no fields provided", async () => {
      const userData = createTestUser();
      await userRepo.create(toUserCreateData(userData));

      await expect(userRepo.update(userData.id, {})).rejects.toThrow(
        /No fields to update/
      );
    });

    it("should update updated_at timestamp", async () => {
      const userData = createTestUser();
      const created = await userRepo.create(toUserCreateData(userData));

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await userRepo.update(userData.id, { name: "New Name" });

      expect(updated.updated_at.getTime()).toBeGreaterThan(
        created.updated_at.getTime()
      );
    });
  });

  describe("delete", () => {
    it("should delete existing user", async () => {
      const userData = createTestUser();
      await userRepo.create(toUserCreateData(userData));

      // Verify user exists
      let found = await userRepo.findById(userData.id);
      expect(found).toBeDefined();

      // Delete user
      await userRepo.delete(userData.id);

      // Verify user no longer exists
      found = await userRepo.findById(userData.id);
      expect(found).toBeNull();
    });

    it("should not throw error when deleting non-existent user", async () => {
      const nonExistentId = randomUUID();

      // Should not throw
      await expect(userRepo.delete(nonExistentId)).resolves.not.toThrow();
    });

    it("should only delete specified user", async () => {
      const user1 = createTestUser({ email: "user1@test.com" });
      const user2 = createTestUser({ email: "user2@test.com" });

      await userRepo.create(user1);
      await userRepo.create(user2);

      // Delete first user
      await userRepo.delete(user1.id);

      // Verify first user deleted, second still exists
      const found1 = await userRepo.findById(user1.id);
      const found2 = await userRepo.findById(user2.id);

      expect(found1).toBeNull();
      expect(found2).toBeDefined();
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple users", async () => {
      const users = [
        createTestUser({ email: "user1@test.com" }),
        createTestUser({ email: "user2@test.com" }),
        createTestUser({ email: "user3@test.com" }),
      ];

      // Create all users
      for (const userData of users) {
        await userRepo.create(toUserCreateData(userData));
      }

      // Verify all users exist
      for (const userData of users) {
        const found = await userRepo.findById(userData.id);
        expect(found).toBeDefined();
      }

      // Verify count
      const count = await countUsers(db);
      expect(count).toBe(users.length);
    });

    it("should handle full CRUD lifecycle", async () => {
      // Create
      const userData = createTestUser();
      const created = await userRepo.create(toUserCreateData(userData));
      expect(created.id).toBe(userData.id);

      // Read
      const read = await userRepo.findById(userData.id);
      expect(read).toBeDefined();

      // Update
      const updated = await userRepo.update(userData.id, { name: "Updated" });
      expect(updated.name).toBe("Updated");

      // Delete
      await userRepo.delete(userData.id);
      const deleted = await userRepo.findById(userData.id);
      expect(deleted).toBeNull();
    });
  });
});
