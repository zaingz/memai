/**
 * Web Content Repository Tests
 *
 * Tests the WebContentRepository class for database operations.
 * These are integration tests that use a real test database
 * provisioned automatically by Encore.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db as bookmarksDb } from "../db";
import { WebContentRepository } from "../repositories/web-content.repository";
import { BookmarkRepository } from "../repositories/bookmark.repository";
import { ContentStatus, BookmarkSource } from "../types";
import { clearAllBookmarkTables } from "../../test/utils/database.util";
import { randomUUID } from "crypto";

describe("WebContentRepository", () => {
  const webContentRepo = new WebContentRepository(bookmarksDb);
  const bookmarkRepo = new BookmarkRepository(bookmarksDb);

  // Clean up database before and after each test
  beforeEach(async () => {
    await clearAllBookmarkTables(bookmarksDb);
  });

  afterEach(async () => {
    await clearAllBookmarkTables(bookmarksDb);
  });

  describe("createPending", () => {
    it("should create a pending web content for a bookmark", async () => {
      // Create a bookmark first
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/test-post",
        title: "Test Blog Post",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      // Create pending web content
      const webContent = await webContentRepo.createPending(bookmark.id);

      // Verify web content was created
      expect(webContent).toBeDefined();
      expect(webContent.bookmark_id).toBe(bookmark.id);
      expect(webContent.status).toBe(ContentStatus.PENDING);
      expect(webContent.raw_markdown).toBeNull();
      expect(webContent.raw_html).toBeNull();
      expect(webContent.summary).toBeNull();
      expect(webContent.error_message).toBeNull();
    });

    it("should be idempotent - return existing record on conflict", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/idempotent-test",
        title: "Idempotent Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      // Create first time
      const first = await webContentRepo.createPending(bookmark.id);
      expect(first.bookmark_id).toBe(bookmark.id);

      // Try to create again - should return existing
      const second = await webContentRepo.createPending(bookmark.id);
      expect(second.bookmark_id).toBe(bookmark.id);
      expect(second.id).toBe(first.id);
    });

    it("should create web content with null data fields", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/null-fields-test",
        title: "Null Fields Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      const webContent = await webContentRepo.createPending(bookmark.id);

      expect(webContent.raw_markdown).toBeNull();
      expect(webContent.raw_html).toBeNull();
      expect(webContent.page_title).toBeNull();
      expect(webContent.page_description).toBeNull();
      expect(webContent.language).toBeNull();
      expect(webContent.word_count).toBeNull();
      expect(webContent.char_count).toBeNull();
      expect(webContent.estimated_reading_minutes).toBeNull();
      expect(webContent.summary).toBeNull();
      expect(webContent.metadata).toBeNull();
    });
  });

  describe("findByBookmarkId", () => {
    it("should find existing web content by bookmark ID", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/find-test",
        title: "Find Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);

      const found = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(found).toBeDefined();
      expect(found?.bookmark_id).toBe(bookmark.id);
    });

    it("should return null for non-existent web content", async () => {
      const found = await webContentRepo.findByBookmarkIdInternal(99999);
      expect(found).toBeNull();
    });

    it("should return web content with null fields correctly", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/null-test",
        title: "Null Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);

      const found = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(found?.raw_markdown).toBeNull();
      expect(found?.summary).toBeNull();
      expect(found?.error_message).toBeNull();
      expect(found?.processing_started_at).toBeNull();
      expect(found?.processing_completed_at).toBeNull();
    });
  });

  describe("findById", () => {
    it("should find web content by ID", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/find-by-id",
        title: "Find By ID Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      const created = await webContentRepo.createPending(bookmark.id);
      const found = await webContentRepo.findById(created.id, userId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.bookmark_id).toBe(bookmark.id);
    });

    it("should return null for non-existent ID", async () => {
      const userId = randomUUID();
      const found = await webContentRepo.findById(99999, userId);
      expect(found).toBeNull();
    });
  });

  describe("markAsProcessing", () => {
    it("should update status to processing", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/processing-test",
        title: "Processing Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.status).toBe(ContentStatus.PROCESSING);
    });

    it("should set processing_started_at timestamp", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/timestamp-test",
        title: "Timestamp Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);

      // Capture time with some margin (1 second before)
      const before = new Date(Date.now() - 1000);
      await webContentRepo.markAsProcessing(bookmark.id);
      const after = new Date(Date.now() + 1000);

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.processing_started_at).toBeDefined();
      expect(webContent?.processing_started_at).toBeInstanceOf(Date);
      expect(webContent?.processing_started_at!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(webContent?.processing_started_at!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("updateContent", () => {
    it("should update all content fields from FireCrawl", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/update-content-test",
        title: "Update Content Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);

      const contentData = {
        raw_markdown: "# Test Article\n\nThis is the content.",
        raw_html: "<h1>Test Article</h1><p>This is the content.</p>",
        page_title: "Test Article Title",
        page_description: "A test article description",
        language: "en",
        word_count: 50,
        char_count: 250,
        estimated_reading_minutes: 1,
        metadata: {
          author: "Test Author",
          publishedTime: "2025-01-14",
          ogImage: "https://example.com/image.jpg",
        },
      };

      await webContentRepo.updateContent(bookmark.id, contentData);

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.raw_markdown).toBe(contentData.raw_markdown);
      expect(webContent?.raw_html).toBe(contentData.raw_html);
      expect(webContent?.page_title).toBe(contentData.page_title);
      expect(webContent?.page_description).toBe(contentData.page_description);
      expect(webContent?.language).toBe(contentData.language);
      expect(webContent?.word_count).toBe(contentData.word_count);
      expect(webContent?.char_count).toBe(contentData.char_count);
      expect(webContent?.estimated_reading_minutes).toBe(contentData.estimated_reading_minutes);
      expect(webContent?.metadata).toBeDefined();
      expect(webContent?.metadata).toMatchObject(contentData.metadata);
    });

    it("should handle large word counts", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/large-article",
        title: "Large Article",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);

      const contentData = {
        raw_markdown: "Very long article content...".repeat(1000),
        raw_html: "<p>Very long article content...</p>".repeat(1000),
        page_title: "Long Form Article",
        page_description: "A very long article",
        language: "en",
        word_count: 5000,
        char_count: 25000,
        estimated_reading_minutes: 25,
        metadata: { type: "long_form" },
      };

      await webContentRepo.updateContent(bookmark.id, contentData);

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.word_count).toBe(5000);
      expect(webContent?.estimated_reading_minutes).toBe(25);
    });

    it("should keep status as processing after updating content", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/status-test",
        title: "Status Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);

      await webContentRepo.updateContent(bookmark.id, {
        raw_markdown: "Content",
        raw_html: "<p>Content</p>",
        page_title: "Title",
        page_description: "Description",
        language: "en",
        word_count: 10,
        char_count: 50,
        estimated_reading_minutes: 1,
        metadata: {},
      });

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.status).toBe(ContentStatus.PROCESSING);
    });
  });

  describe("updateSummary", () => {
    it("should update summary field", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/summary-test",
        title: "Summary Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);

      const summary = "This is an AI-generated summary of the article.";
      await webContentRepo.updateSummary(bookmark.id, summary);

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.summary).toBe(summary);
    });
  });

  describe("markAsCompleted", () => {
    it("should mark web content as completed", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/completed-test",
        title: "Completed Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);
      await webContentRepo.markAsCompleted(bookmark.id);

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.status).toBe(ContentStatus.COMPLETED);
    });

    it("should set processing_completed_at timestamp", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/completed-timestamp",
        title: "Completed Timestamp Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);

      const before = new Date(Date.now() - 1000);
      await webContentRepo.markAsCompleted(bookmark.id);
      const after = new Date(Date.now() + 1000);

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.processing_completed_at).toBeDefined();
      expect(webContent?.processing_completed_at).toBeInstanceOf(Date);
      expect(webContent?.processing_completed_at!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(webContent?.processing_completed_at!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("markAsFailed", () => {
    it("should update status to failed with error message", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/failed-test",
        title: "Failed Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);

      const errorMessage = "FireCrawl API error: Rate limit exceeded";
      await webContentRepo.markAsFailed(bookmark.id, errorMessage);

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.status).toBe(ContentStatus.FAILED);
      expect(webContent?.error_message).toBe(errorMessage);
    });

    it("should set processing_completed_at timestamp", async () => {
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/failed-timestamp",
        title: "Failed Timestamp Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);

      const before = new Date(Date.now() - 1000);
      await webContentRepo.markAsFailed(bookmark.id, "Test error");
      const after = new Date(Date.now() + 1000);

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.processing_completed_at).toBeDefined();
      expect(webContent?.processing_completed_at).toBeInstanceOf(Date);
      expect(webContent?.processing_completed_at!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(webContent?.processing_completed_at!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("list", () => {
    it("should list all web content with pagination", async () => {
      const userId = randomUUID();

      // Create 5 test bookmarks
      for (let i = 0; i < 5; i++) {
        const bookmark = await bookmarkRepo.create({
          user_id: userId,
          url: `https://example.com/blog/post-${i}`,
          title: `Post ${i}`,
          source: BookmarkSource.BLOG,
          client_time: new Date(),
          metadata: null,
        });
        await webContentRepo.createPending(bookmark.id);
      }

      // List first 3
      const firstPage = await webContentRepo.list({
        userId,
        limit: 3,
        offset: 0,
      });
      expect(firstPage).toHaveLength(3);

      // List next 2
      const secondPage = await webContentRepo.list({
        userId,
        limit: 3,
        offset: 3,
      });
      expect(secondPage).toHaveLength(2);
    });

    it("should filter by status", async () => {
      const userId = randomUUID();

      // Create bookmarks with different statuses
      for (let i = 0; i < 3; i++) {
        const bookmark = await bookmarkRepo.create({
          user_id: userId,
          url: `https://example.com/blog/pending-${i}`,
          title: `Pending ${i}`,
          source: BookmarkSource.BLOG,
          client_time: new Date(),
          metadata: null,
        });
        await webContentRepo.createPending(bookmark.id);
      }

      for (let i = 0; i < 2; i++) {
        const bookmark = await bookmarkRepo.create({
          user_id: userId,
          url: `https://example.com/blog/completed-${i}`,
          title: `Completed ${i}`,
          source: BookmarkSource.BLOG,
          client_time: new Date(),
          metadata: null,
        });
        await webContentRepo.createPending(bookmark.id);
        await webContentRepo.markAsProcessing(bookmark.id);
        await webContentRepo.markAsCompleted(bookmark.id);
      }

      // List only pending
      const pending = await webContentRepo.list({
        userId,
        limit: 10,
        offset: 0,
        status: ContentStatus.PENDING,
      });
      expect(pending).toHaveLength(3);
      expect(pending.every(wc => wc.status === ContentStatus.PENDING)).toBe(true);

      // List only completed
      const completed = await webContentRepo.list({
        userId,
        limit: 10,
        offset: 0,
        status: ContentStatus.COMPLETED,
      });
      expect(completed).toHaveLength(2);
      expect(completed.every(wc => wc.status === ContentStatus.COMPLETED)).toBe(true);
    });

    it("should return empty array when no results", async () => {
      const userId = randomUUID();
      const results = await webContentRepo.list({
        userId,
        limit: 10,
        offset: 0,
      });
      expect(results).toEqual([]);
    });

    it("should order by created_at DESC (newest first)", async () => {
      const userId = randomUUID();

      // Create 3 bookmarks with small delays
      const bookmarkIds: number[] = [];
      for (let i = 0; i < 3; i++) {
        const bookmark = await bookmarkRepo.create({
          user_id: userId,
          url: `https://example.com/blog/order-${i}`,
          title: `Order ${i}`,
          source: BookmarkSource.BLOG,
          client_time: new Date(),
          metadata: null,
        });
        await webContentRepo.createPending(bookmark.id);
        bookmarkIds.push(bookmark.id);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const results = await webContentRepo.list({
        userId,
        limit: 10,
        offset: 0,
      });

      // Should be in reverse order (newest first)
      expect(results[0].bookmark_id).toBe(bookmarkIds[2]);
      expect(results[1].bookmark_id).toBe(bookmarkIds[1]);
      expect(results[2].bookmark_id).toBe(bookmarkIds[0]);
    });
  });

  describe("User Ownership", () => {
    it("should return null when bookmark belongs to different user (findByBookmarkId)", async () => {
      // Setup: Two users
      const user1Id = randomUUID();
      const user2Id = randomUUID();

      // Create bookmark for user1
      const bookmark = await bookmarkRepo.create({
        user_id: user1Id,
        url: "https://example.com/article",
        title: "User 1 Article",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      // Create web content
      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);
      await webContentRepo.updateContent(bookmark.id, {
        raw_markdown: "# Article Content",
        raw_html: "<h1>Article Content</h1>",
        page_title: "Article",
        page_description: "Description",
        language: "en",
        word_count: 2,
        char_count: 17,
        estimated_reading_minutes: 1,
        metadata: {},
      });

      // Attempt to access as user2 (should return null)
      const content = await webContentRepo.findByBookmarkId(bookmark.id, user2Id);

      expect(content).toBeNull();
    });

    it("should return web content when bookmark belongs to same user", async () => {
      // Setup
      const userId = randomUUID();
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/article",
        title: "User Article",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.updateContent(bookmark.id, {
        raw_markdown: "# Content",
        raw_html: "<h1>Content</h1>",
        page_title: "Title",
        page_description: "Description",
        language: "en",
        word_count: 1,
        char_count: 9,
        estimated_reading_minutes: 1,
        metadata: {},
      });

      // Access as same user (should succeed)
      const content = await webContentRepo.findByBookmarkId(bookmark.id, userId);

      expect(content).toBeDefined();
      expect(content?.bookmark_id).toBe(bookmark.id);
      expect(content?.page_title).toBe("Title");
    });

    it("should return null when web content's bookmark belongs to different user (findById)", async () => {
      // Setup
      const user1Id = randomUUID();
      const user2Id = randomUUID();

      const bookmark = await bookmarkRepo.create({
        user_id: user1Id,
        url: "https://example.com/article",
        title: "User 1 Article",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      const content = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(content).toBeDefined();

      // Attempt to access by content ID as user2
      const result = await webContentRepo.findById(content!.id, user2Id);

      expect(result).toBeNull();
    });

    it("should not delete web content when bookmark belongs to different user", async () => {
      // Setup
      const user1Id = randomUUID();
      const user2Id = randomUUID();

      const bookmark = await bookmarkRepo.create({
        user_id: user1Id,
        url: "https://example.com/article",
        title: "User 1 Article",
        source: BookmarkSource.WEB,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      const content = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(content).toBeDefined();

      // Attempt to delete as user2 (should throw)
      await expect(
        webContentRepo.delete(content!.id, user2Id)
      ).rejects.toThrow(/not found for user/);

      // Verify content still exists
      const stillExists = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(stillExists).toBeDefined();
    });
  });

  describe("integration scenarios", () => {
    it("should handle full web content lifecycle", async () => {
      const userId = randomUUID();

      // Create bookmark
      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/lifecycle-test",
        title: "Lifecycle Test Article",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      // Stage 1: Create pending web content
      let webContent = await webContentRepo.createPending(bookmark.id);
      expect(webContent.status).toBe(ContentStatus.PENDING);

      // Stage 2: Mark as processing
      await webContentRepo.markAsProcessing(bookmark.id);
      webContent = (await webContentRepo.findByBookmarkIdInternal(bookmark.id))!;
      expect(webContent.status).toBe(ContentStatus.PROCESSING);
      expect(webContent.processing_started_at).toBeDefined();

      // Stage 3: Update with FireCrawl data
      await webContentRepo.updateContent(bookmark.id, {
        raw_markdown: "# Article Content\n\nThis is the article.",
        raw_html: "<h1>Article Content</h1><p>This is the article.</p>",
        page_title: "Article Title",
        page_description: "Article description",
        language: "en",
        word_count: 100,
        char_count: 500,
        estimated_reading_minutes: 1,
        metadata: { author: "Author" },
      });

      webContent = (await webContentRepo.findByBookmarkIdInternal(bookmark.id))!;
      expect(webContent.raw_markdown).toBe("# Article Content\n\nThis is the article.");
      expect(webContent.status).toBe(ContentStatus.PROCESSING);

      // Stage 4: Update with OpenAI summary
      await webContentRepo.updateSummary(bookmark.id, "AI-generated summary");

      // Stage 5: Mark as completed
      await webContentRepo.markAsCompleted(bookmark.id);

      // Final verification
      const finalWebContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(finalWebContent?.summary).toBe("AI-generated summary");
      expect(finalWebContent?.status).toBe(ContentStatus.COMPLETED);
      expect(finalWebContent?.processing_completed_at).toBeDefined();

      // Verify all fields are preserved
      expect(finalWebContent?.raw_markdown).toBe("# Article Content\n\nThis is the article.");
      expect(finalWebContent?.page_title).toBe("Article Title");
      expect(finalWebContent?.word_count).toBe(100);
      expect(finalWebContent?.metadata).toBeDefined();
    });

    it("should handle failure during processing", async () => {
      const userId = randomUUID();

      const bookmark = await bookmarkRepo.create({
        user_id: userId,
        url: "https://example.com/blog/failure-test",
        title: "Failure Test",
        source: BookmarkSource.BLOG,
        client_time: new Date(),
        metadata: null,
      });

      await webContentRepo.createPending(bookmark.id);
      await webContentRepo.markAsProcessing(bookmark.id);

      // Simulate failure
      await webContentRepo.markAsFailed(bookmark.id, "FireCrawl timeout");

      const webContent = await webContentRepo.findByBookmarkIdInternal(bookmark.id);
      expect(webContent?.status).toBe(ContentStatus.FAILED);
      expect(webContent?.error_message).toBe("FireCrawl timeout");
      expect(webContent?.processing_completed_at).toBeDefined();
    });
  });
});
