/**
 * Test Data Builders - Usage Demonstration
 *
 * This file demonstrates how to use the test data builders
 * for creating test fixtures with a fluent, chainable API.
 *
 * Builders simplify test setup by:
 * - Providing sensible defaults
 * - Offering readable, self-documenting test code
 * - Reducing boilerplate
 * - Handling complex object relationships
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  BookmarkBuilder,
  TranscriptionBuilder,
  WebContentBuilder,
  DigestBuilder,
  UserBuilder,
} from "../builders";
import { randomUUID } from "crypto";
import { clearBookmarksTable, clearUsersTable } from "../utils/database.util";
import { db as bookmarksDb } from "../../bookmarks/db";
import { db as usersDb } from "../../users/db";
import { BookmarkSource, TranscriptionStatus, ContentStatus } from "../../bookmarks/types";

describe("Test Data Builders - Usage Examples", () => {
  beforeEach(async () => {
    await clearBookmarksTable(bookmarksDb);
    await clearUsersTable(usersDb);
  });

  afterEach(async () => {
    await clearBookmarksTable(bookmarksDb);
    await clearUsersTable(usersDb);
  });

  describe("BookmarkBuilder", () => {
    it("should create a simple YouTube bookmark", async () => {
      const userId = randomUUID();

      const bookmark = await new BookmarkBuilder()
        .forUser(userId)
        .asYouTube("dQw4w9WgXcQ")
        .build();

      expect(bookmark).toBeDefined();
      expect(bookmark.user_id).toBe(userId);
      expect(bookmark.source).toBe(BookmarkSource.YOUTUBE);
      expect(bookmark.url).toContain("dQw4w9WgXcQ");
      expect(bookmark.title).toContain("dQw4w9WgXcQ");
    });

    it("should create a podcast bookmark", async () => {
      const userId = randomUUID();

      const bookmark = await new BookmarkBuilder()
        .forUser(userId)
        .asPodcast("ep-456")
        .build();

      expect(bookmark.source).toBe(BookmarkSource.PODCAST);
      expect(bookmark.url).toContain("ep-456");
      expect(bookmark.title).toContain("ep-456");
    });

    it("should create a bookmark without title", async () => {
      const userId = randomUUID();

      const bookmark = await new BookmarkBuilder()
        .forUser(userId)
        .withUrl("https://example.com/article")
        .withoutTitle()
        .build();

      expect(bookmark.title).toBeNull();
      expect(bookmark.url).toBe("https://example.com/article");
    });

    it("should create a bookmark with custom source", async () => {
      const userId = randomUUID();

      const bookmark = await new BookmarkBuilder()
        .forUser(userId)
        .withUrl("https://reddit.com/r/test")
        .withSource(BookmarkSource.REDDIT)
        .build();

      expect(bookmark.source).toBe(BookmarkSource.REDDIT);
    });
  });

  describe("TranscriptionBuilder", () => {
    it("should create a completed transcription with bookmark", async () => {
      const userId = randomUUID();

      const { bookmark, transcription } = await new TranscriptionBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube("test123"))
        .asCompleted("This is a test transcript")
        .build();

      expect(bookmark).toBeDefined();
      expect(bookmark.user_id).toBe(userId);
      expect(transcription).toBeDefined();
      expect(transcription.bookmark_id).toBe(bookmark.id);
      expect(transcription.status).toBe(TranscriptionStatus.COMPLETED);
      expect(transcription.transcript).toBe("This is a test transcript");
      expect(transcription.summary).toBe("Test summary");
    });

    it("should create a pending transcription", async () => {
      const userId = randomUUID();

      const { bookmark, transcription } = await new TranscriptionBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube())
        .asPending()
        .build();

      expect(transcription.status).toBe(TranscriptionStatus.PENDING);
      expect(transcription.transcript).toBeNull();
      expect(transcription.summary).toBeNull();
    });

    it("should create a failed transcription", async () => {
      const userId = randomUUID();

      const { bookmark, transcription } = await new TranscriptionBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube())
        .asFailed("Transcription service timeout")
        .build();

      expect(transcription.status).toBe(TranscriptionStatus.FAILED);
      expect(transcription.error_message).toBeTruthy();
    });

    it("should create a processing transcription", async () => {
      const userId = randomUUID();

      const { bookmark, transcription } = await new TranscriptionBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube())
        .asProcessing()
        .build();

      expect(transcription.status).toBe(TranscriptionStatus.PROCESSING);
    });
  });

  describe("WebContentBuilder", () => {
    it("should create completed web content with bookmark", async () => {
      const userId = randomUUID();

      const { bookmark, webContent } = await new WebContentBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId).withUrl("https://example.com/article"))
        .asCompleted("# Article Title\n\nArticle content here.")
        .build();

      expect(bookmark).toBeDefined();
      expect(webContent).toBeDefined();
      expect(webContent.bookmark_id).toBe(bookmark.id);
      expect(webContent.status).toBe(ContentStatus.COMPLETED);
      expect(webContent.raw_markdown).toBe("# Article Title\n\nArticle content here.");
    });

    it("should create web content with custom word count", async () => {
      const userId = randomUUID();

      const { webContent } = await new WebContentBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId))
        .asCompleted()
        .withWordCount(500)
        .build();

      expect(webContent.word_count).toBe(500);
      expect(webContent.estimated_reading_minutes).toBeGreaterThan(0);
    });

    it("should create failed web content", async () => {
      const userId = randomUUID();

      const { webContent } = await new WebContentBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId))
        .asFailed()
        .build();

      expect(webContent.status).toBe(ContentStatus.FAILED);
      expect(webContent.raw_markdown).toBeNull();
    });
  });

  describe("DigestBuilder", () => {
    it("should create a completed digest for a user", async () => {
      const userId = randomUUID();
      const digestDate = new Date("2025-01-15");

      const digest = await new DigestBuilder()
        .forUser(userId)
        .forDate(digestDate)
        .asCompleted("Daily digest content with summaries")
        .withBookmarkCount(10)
        .build();

      expect(digest).toBeDefined();
      expect(digest.user_id).toBe(userId);
      expect(digest.bookmark_count).toBe(10);
      expect(digest.digest_content).toBe("Daily digest content with summaries");
    });

    it("should create a failed digest", async () => {
      const userId = randomUUID();

      const digest = await new DigestBuilder()
        .forUser(userId)
        .asFailed()
        .build();

      expect(digest.status).toBe("failed");
      expect(digest.digest_content).toBeNull();
    });

    it("should create a global digest (no user)", async () => {
      const digest = await new DigestBuilder()
        .forDate(new Date("2025-01-20"))
        .withBookmarkCount(50)
        .build();

      expect(digest.user_id).toBeNull();
      expect(digest.bookmark_count).toBe(50);
    });
  });

  describe("UserBuilder", () => {
    it("should create a user directly via repository", async () => {
      const user = await new UserBuilder()
        .withEmail("test@example.com")
        .withName("Test User")
        .build();

      expect(user).toBeDefined();
      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
    });

    it("should create a user without name", async () => {
      const user = await new UserBuilder()
        .withEmail("noname@example.com")
        .withoutName()
        .build();

      expect(user.name).toBeNull();
    });

    it("should create a user with specific ID", async () => {
      const customId = randomUUID();

      const user = await new UserBuilder()
        .withId(customId)
        .withEmail("custom@example.com")
        .build();

      expect(user.id).toBe(customId);
    });

    it("should create a user via webhook", async () => {
      const user = await new UserBuilder()
        .withEmail("webhook@example.com")
        .withName("Webhook User")
        .viaWebhook()
        .build();

      expect(user).toBeDefined();
      expect(user.email).toBe("webhook@example.com");
      expect(user.migrated_to_supabase).toBe(true);
    });
  });

  describe("Complex Scenarios", () => {
    it("should create a complete user workflow with bookmarks and transcriptions", async () => {
      // Create user
      const user = await new UserBuilder()
        .withEmail("workflow@example.com")
        .withName("Workflow User")
        .build();

      // Create YouTube bookmark with completed transcription
      const { bookmark: ytBookmark, transcription } = await new TranscriptionBuilder()
        .withBookmark(new BookmarkBuilder().forUser(user.id).asYouTube("video123"))
        .asCompleted("Full YouTube transcript")
        .build();

      // Create web bookmark with completed content
      const { bookmark: webBookmark, webContent } = await new WebContentBuilder()
        .withBookmark(new BookmarkBuilder().forUser(user.id).withUrl("https://blog.example.com"))
        .asCompleted("# Blog Post\n\nContent here")
        .withWordCount(300)
        .build();

      // Create digest for user
      const digest = await new DigestBuilder()
        .forUser(user.id)
        .forDate(new Date())
        .asCompleted("User's daily digest")
        .withBookmarkCount(2)
        .build();

      // Verify everything is linked correctly
      expect(ytBookmark.user_id).toBe(user.id);
      expect(webBookmark.user_id).toBe(user.id);
      expect(transcription.bookmark_id).toBe(ytBookmark.id);
      expect(webContent.bookmark_id).toBe(webBookmark.id);
      expect(digest.user_id).toBe(user.id);
    });

    it("should create multiple bookmarks with different states", async () => {
      const userId = randomUUID();

      // Pending transcription
      const { bookmark: pending } = await new TranscriptionBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube("video1"))
        .asPending()
        .build();

      // Processing transcription
      const { bookmark: processing } = await new TranscriptionBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube("video2"))
        .asProcessing()
        .build();

      // Completed transcription
      const { bookmark: completed } = await new TranscriptionBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube("video3"))
        .asCompleted("Completed transcript")
        .build();

      // Failed transcription
      const { bookmark: failed } = await new TranscriptionBuilder()
        .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube("video4"))
        .asFailed("Error")
        .build();

      // All belong to same user
      expect(pending.user_id).toBe(userId);
      expect(processing.user_id).toBe(userId);
      expect(completed.user_id).toBe(userId);
      expect(failed.user_id).toBe(userId);
    });
  });
});
