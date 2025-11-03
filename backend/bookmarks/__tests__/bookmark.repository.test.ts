/**
 * Bookmark Repository Tests
 *
 * Tests the BookmarkRepository class for database operations.
 * These are integration tests that use a real test database
 * provisioned automatically by Encore.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../db";
import { BookmarkRepository } from "../repositories/bookmark.repository";
import { BookmarkSource } from "../types";
import {
  createTestBookmark,
  createYouTubeBookmark,
  createPodcastBookmark,
  createWebBookmark,
} from "../../test/factories/bookmark.factory";
import {
  clearBookmarksTable,
  bookmarkExists,
  countBookmarksByUser,
} from "../../test/utils/database.util";
import { randomUUID } from "crypto";

describe("BookmarkRepository", () => {
  const bookmarkRepo = new BookmarkRepository(db);

  // Clean up database before and after each test
  beforeEach(async () => {
    await clearBookmarksTable(db);
  });

  afterEach(async () => {
    await clearBookmarksTable(db);
  });

  describe("create", () => {
    it("should create a new bookmark with all fields", async () => {
      const userId = randomUUID();
      const bookmarkData = {
        user_id: userId,
        url: "https://www.youtube.com/watch?v=test123",
        title: "Test Video",
        source: BookmarkSource.YOUTUBE,
        client_time: new Date("2025-01-01T00:00:00Z"),
        metadata: { videoId: "test123", duration: 300 },
      };

      const bookmark = await bookmarkRepo.create(bookmarkData);

      expect(bookmark).toBeDefined();
      expect(bookmark.id).toBeGreaterThan(0);
      expect(bookmark.user_id).toBe(userId);
      expect(bookmark.url).toBe(bookmarkData.url);
      expect(bookmark.title).toBe(bookmarkData.title);
      expect(bookmark.source).toBe(BookmarkSource.YOUTUBE);
      expect(bookmark.metadata).toEqual(bookmarkData.metadata);
      expect(bookmark.created_at).toBeInstanceOf(Date);
    });

    it("should create a bookmark with null title", async () => {
      const userId = randomUUID();
      const bookmarkData = {
        user_id: userId,
        url: "https://example.com/article",
        title: null,
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      };

      const bookmark = await bookmarkRepo.create(bookmarkData);

      expect(bookmark).toBeDefined();
      expect(bookmark.title).toBeNull();
      expect(bookmark.url).toBe(bookmarkData.url);
    });

    it("should create a bookmark with null metadata", async () => {
      const userId = randomUUID();
      const bookmarkData = {
        user_id: userId,
        url: "https://example.com",
        title: "Test",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      };

      const bookmark = await bookmarkRepo.create(bookmarkData);

      expect(bookmark).toBeDefined();
      expect(bookmark.metadata).toBeNull();
    });

    it("should serialize metadata as JSON", async () => {
      const userId = randomUUID();
      const metadata = {
        videoId: "abc123",
        duration: 500,
        tags: ["tech", "tutorial"],
      };

      const bookmarkData = {
        user_id: userId,
        url: "https://youtube.com/watch?v=abc123",
        title: "Tutorial",
        source: BookmarkSource.YOUTUBE,
        client_time: new Date(),
        metadata,
      };

      const bookmark = await bookmarkRepo.create(bookmarkData);

      expect(bookmark.metadata).toEqual(metadata);
      expect(bookmark.metadata?.tags).toEqual(["tech", "tutorial"]);
    });

    it("should handle multiple users creating bookmarks", async () => {
      const user1Id = randomUUID();
      const user2Id = randomUUID();

      const bookmark1 = await bookmarkRepo.create({
        user_id: user1Id,
        url: "https://example.com/1",
        title: "User 1 Bookmark",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      const bookmark2 = await bookmarkRepo.create({
        user_id: user2Id,
        url: "https://example.com/2",
        title: "User 2 Bookmark",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      expect(bookmark1.user_id).toBe(user1Id);
      expect(bookmark2.user_id).toBe(user2Id);
      expect(bookmark1.id).not.toBe(bookmark2.id);
    });
  });

  describe("findById", () => {
    it("should find existing bookmark by ID", async () => {
      const userId = randomUUID();
      const created = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/test",
        title: "Test Bookmark",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      const found = await bookmarkRepo.findById(created.id, userId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.url).toBe(created.url);
      expect(found?.title).toBe(created.title);
    });

    it("should return null for non-existent bookmark", async () => {
      const userId = randomUUID();
      const found = await bookmarkRepo.findById(99999, userId);

      expect(found).toBeNull();
    });

    it("should return null when bookmark belongs to different user", async () => {
      const user1Id = randomUUID();
      const user2Id = randomUUID();

      const created = await bookmarkRepo.create({
        user_id: user1Id,
        url: "https://example.com/user1",
        title: "User 1 Bookmark",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      // Try to find with different user ID
      const found = await bookmarkRepo.findById(created.id, user2Id);

      expect(found).toBeNull();
    });

    it("should find bookmark with null title and metadata", async () => {
      const userId = randomUUID();
      const created = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com",
        title: null,
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      const found = await bookmarkRepo.findById(created.id, userId);

      expect(found).toBeDefined();
      expect(found?.title).toBeNull();
      expect(found?.metadata).toBeNull();
    });
  });

  describe("list", () => {
    it("should list all bookmarks for a user", async () => {
      const userId = randomUUID();

      // Create 3 bookmarks
      await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/1",
        title: "Bookmark 1",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/2",
        title: "Bookmark 2",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/3",
        title: "Bookmark 3",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      const result = await bookmarkRepo.list({
        userId,
        limit: 10,
        offset: 0,
      });

      expect(result.bookmarks).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("should paginate results correctly", async () => {
      const userId = randomUUID();

      // Create 5 bookmarks
      for (let i = 1; i <= 5; i++) {
        await bookmarkRepo.create({
          user_id: userId,
          url: `https://example.com/${i}`,
          title: `Bookmark ${i}`,
          source: BookmarkSource.WEB,
          client_time: new Date(Date.now() + i * 1000), // Ensure different timestamps
          metadata: null,
        });
      }

      // Get first page (limit 2, offset 0)
      const page1 = await bookmarkRepo.list({
        userId,
        limit: 2,
        offset: 0,
      });

      expect(page1.bookmarks).toHaveLength(2);
      expect(page1.total).toBe(5);

      // Get second page (limit 2, offset 2)
      const page2 = await bookmarkRepo.list({
        userId,
        limit: 2,
        offset: 2,
      });

      expect(page2.bookmarks).toHaveLength(2);
      expect(page2.total).toBe(5);

      // Ensure pages have different bookmarks
      expect(page1.bookmarks[0].id).not.toBe(page2.bookmarks[0].id);
    });

    it("should filter bookmarks by source", async () => {
      const userId = randomUUID();

      // Create bookmarks with different sources
      await bookmarkRepo.create({
        user_id: userId,
        url: "https://youtube.com/watch?v=1",
        title: "YouTube Video",
        source: BookmarkSource.YOUTUBE,
        client_time: new Date(),
        metadata: null,
      });

      await bookmarkRepo.create({
        user_id: userId,
        url: "https://podcast.com/ep1",
        title: "Podcast Episode",
        source: BookmarkSource.PODCAST,
        client_time: new Date(),
        metadata: null,
      });

      await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/article",
        title: "Web Article",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      // Filter by YOUTUBE
      const youtubeResult = await bookmarkRepo.list({
        userId,
        limit: 10,
        offset: 0,
        source: BookmarkSource.YOUTUBE,
      });

      expect(youtubeResult.bookmarks).toHaveLength(1);
      expect(youtubeResult.total).toBe(1);
      expect(youtubeResult.bookmarks[0].source).toBe(BookmarkSource.YOUTUBE);

      // Filter by PODCAST
      const podcastResult = await bookmarkRepo.list({
        userId,
        limit: 10,
        offset: 0,
        source: BookmarkSource.PODCAST,
      });

      expect(podcastResult.bookmarks).toHaveLength(1);
      expect(podcastResult.total).toBe(1);
      expect(podcastResult.bookmarks[0].source).toBe(BookmarkSource.PODCAST);
    });

    it("should return empty array when user has no bookmarks", async () => {
      const userId = randomUUID();

      const result = await bookmarkRepo.list({
        userId,
        limit: 10,
        offset: 0,
      });

      expect(result.bookmarks).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should only return bookmarks for specified user", async () => {
      const user1Id = randomUUID();
      const user2Id = randomUUID();

      // Create bookmarks for user1
      await bookmarkRepo.create({
        user_id: user1Id,
        url: "https://example.com/user1-1",
        title: "User 1 Bookmark 1",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      await bookmarkRepo.create({
        user_id: user1Id,
        url: "https://example.com/user1-2",
        title: "User 1 Bookmark 2",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      // Create bookmark for user2
      await bookmarkRepo.create({
        user_id: user2Id,
        url: "https://example.com/user2-1",
        title: "User 2 Bookmark 1",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      // List bookmarks for user1
      const user1Result = await bookmarkRepo.list({
        userId: user1Id,
        limit: 10,
        offset: 0,
      });

      expect(user1Result.bookmarks).toHaveLength(2);
      expect(user1Result.total).toBe(2);
      user1Result.bookmarks.forEach((b) => {
        expect(b.user_id).toBe(user1Id);
      });

      // List bookmarks for user2
      const user2Result = await bookmarkRepo.list({
        userId: user2Id,
        limit: 10,
        offset: 0,
      });

      expect(user2Result.bookmarks).toHaveLength(1);
      expect(user2Result.total).toBe(1);
      expect(user2Result.bookmarks[0].user_id).toBe(user2Id);
    });

    it("should order bookmarks by created_at DESC (newest first)", async () => {
      const userId = randomUUID();

      // Create bookmarks with specific timestamps
      const bookmark1 = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/old",
        title: "Old Bookmark",
        source: BookmarkSource.WEB,
        client_time: new Date("2025-01-01T00:00:00Z"),
        metadata: null,
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const bookmark2 = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/new",
        title: "New Bookmark",
        source: BookmarkSource.WEB,
        client_time: new Date("2025-01-02T00:00:00Z"),
        metadata: null,
      });

      const result = await bookmarkRepo.list({
        userId,
        limit: 10,
        offset: 0,
      });

      // Newest should be first
      expect(result.bookmarks[0].id).toBe(bookmark2.id);
      expect(result.bookmarks[1].id).toBe(bookmark1.id);
    });
  });

  describe("update", () => {
    it("should update bookmark URL", async () => {
      const userId = randomUUID();
      const created = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/old",
        title: "Test",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      const updated = await bookmarkRepo.update(created.id, userId, {
        url: "https://example.com/new",
      });

      expect(updated.url).toBe("https://example.com/new");
      expect(updated.title).toBe(created.title); // Unchanged
      expect(updated.id).toBe(created.id);
    });

    it("should update bookmark title", async () => {
      const userId = randomUUID();
      const created = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com",
        title: "Old Title",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      const updated = await bookmarkRepo.update(created.id, userId, {
        title: "New Title",
      });

      expect(updated.title).toBe("New Title");
      expect(updated.url).toBe(created.url); // Unchanged
    });

    it("should update bookmark source", async () => {
      const userId = randomUUID();
      const created = await bookmarkRepo.create({
        user_id: userId,
        url: "https://youtube.com/watch?v=test",
        title: "Video",
        source: BookmarkSource.OTHER,
        client_time: new Date(),
        metadata: null,
      });

      const updated = await bookmarkRepo.update(created.id, userId, {
        source: BookmarkSource.YOUTUBE,
      });

      expect(updated.source).toBe(BookmarkSource.YOUTUBE);
    });

    it("should update bookmark metadata", async () => {
      const userId = randomUUID();
      const created = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com",
        title: "Test",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: { oldKey: "oldValue" },
      });

      const newMetadata = { newKey: "newValue", extra: 123 };
      const updated = await bookmarkRepo.update(created.id, userId, {
        metadata: newMetadata,
      });

      expect(updated.metadata).toEqual(newMetadata);
    });

    it("should update multiple fields at once", async () => {
      const userId = randomUUID();
      const created = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/old",
        title: "Old Title",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: { old: "data" },
      });

      const updated = await bookmarkRepo.update(created.id, userId, {
        url: "https://example.com/new",
        title: "New Title",
        source: BookmarkSource.YOUTUBE,
        metadata: { new: "data" },
      });

      expect(updated.url).toBe("https://example.com/new");
      expect(updated.title).toBe("New Title");
      expect(updated.source).toBe(BookmarkSource.YOUTUBE);
      expect(updated.metadata).toEqual({ new: "data" });
    });

    it("should throw error when updating non-existent bookmark", async () => {
      const userId = randomUUID();

      await expect(
        bookmarkRepo.update(99999, userId, { title: "New Title" })
      ).rejects.toThrow(/not found/i);
    });

    it("should throw error when updating bookmark of different user", async () => {
      const user1Id = randomUUID();
      const user2Id = randomUUID();

      const created = await bookmarkRepo.create({
        user_id: user1Id,
        url: "https://example.com",
        title: "User 1 Bookmark",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      // Try to update with different user ID
      await expect(
        bookmarkRepo.update(created.id, user2Id, { title: "Hacked!" })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("updateSource", () => {
    it("should update source without user filtering", async () => {
      const userId = randomUUID();
      const created = await bookmarkRepo.create({
        user_id: userId,
        url: "https://youtube.com/watch?v=test",
        title: "Video",
        source: BookmarkSource.OTHER,
        client_time: new Date(),
        metadata: null,
      });

      await bookmarkRepo.updateSource(created.id, BookmarkSource.YOUTUBE);

      const found = await bookmarkRepo.findById(created.id, userId);
      expect(found?.source).toBe(BookmarkSource.YOUTUBE);
    });

    it("should throw error when updating source of non-existent bookmark", async () => {
      await expect(
        bookmarkRepo.updateSource(99999, BookmarkSource.YOUTUBE)
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("delete", () => {
    it("should delete existing bookmark", async () => {
      const userId = randomUUID();
      const created = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com",
        title: "To Delete",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      // Verify bookmark exists
      let found = await bookmarkRepo.findById(created.id, userId);
      expect(found).toBeDefined();

      // Delete bookmark
      await bookmarkRepo.delete(created.id, userId);

      // Verify bookmark no longer exists
      found = await bookmarkRepo.findById(created.id, userId);
      expect(found).toBeNull();
    });

    it("should throw error when deleting non-existent bookmark", async () => {
      const userId = randomUUID();

      await expect(bookmarkRepo.delete(99999, userId)).rejects.toThrow(
        /not found/i
      );
    });

    it("should throw error when deleting bookmark of different user", async () => {
      const user1Id = randomUUID();
      const user2Id = randomUUID();

      const created = await bookmarkRepo.create({
        user_id: user1Id,
        url: "https://example.com",
        title: "User 1 Bookmark",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      // Try to delete with different user ID
      await expect(bookmarkRepo.delete(created.id, user2Id)).rejects.toThrow(
        /not found/i
      );

      // Verify bookmark still exists for original user
      const found = await bookmarkRepo.findById(created.id, user1Id);
      expect(found).toBeDefined();
    });
  });

  describe("integration scenarios", () => {
    it("should handle full CRUD lifecycle", async () => {
      const userId = randomUUID();

      // Create
      const created = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/test",
        title: "Test Bookmark",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: { key: "value" },
      });
      expect(created.id).toBeGreaterThan(0);

      // Read
      const read = await bookmarkRepo.findById(created.id, userId);
      expect(read).toBeDefined();

      // Update
      const updated = await bookmarkRepo.update(created.id, userId, {
        title: "Updated Title",
      });
      expect(updated.title).toBe("Updated Title");

      // Delete
      await bookmarkRepo.delete(created.id, userId);
      const deleted = await bookmarkRepo.findById(created.id, userId);
      expect(deleted).toBeNull();
    });

    it("should handle multiple bookmarks from different sources", async () => {
      const userId = randomUUID();

      // Create bookmarks from different sources
      const youtube = await bookmarkRepo.create({
        user_id: userId,
        url: "https://youtube.com/watch?v=1",
        title: "YouTube Video",
        source: BookmarkSource.YOUTUBE,
        client_time: new Date(),
        metadata: { videoId: "1" },
      });

      const podcast = await bookmarkRepo.create({
        user_id: userId,
        url: "https://podcast.com/ep1",
        title: "Podcast Episode",
        source: BookmarkSource.PODCAST,
        client_time: new Date(),
        metadata: { episodeId: "ep1" },
      });

      const web = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/article",
        title: "Web Article",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      // Verify all created
      const all = await bookmarkRepo.list({ userId, limit: 10, offset: 0 });
      expect(all.total).toBe(3);

      // Verify filtering works
      const youtubeOnly = await bookmarkRepo.list({
        userId,
        limit: 10,
        offset: 0,
        source: BookmarkSource.YOUTUBE,
      });
      expect(youtubeOnly.total).toBe(1);
      expect(youtubeOnly.bookmarks[0].id).toBe(youtube.id);
    });
  });
});
