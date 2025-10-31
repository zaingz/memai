/**
 * Content Extraction Processor Tests
 *
 * Unit tests for the content extraction processor that:
 * - Filters for textual sources (blog, web, reddit, twitter, linkedin)
 * - Skips audio sources (youtube, podcast)
 * - Extracts content using FireCrawl
 * - Stores content metrics (word count, reading time)
 * - Implements idempotency checks
 * - Handles errors gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookmarkSourceClassifiedEvent, BookmarkSource, ContentStatus } from "../../types";

// Hoist mock functions for use in module mocks
const {
  mockScrape,
  mockPublish,
  mockFindByBookmarkId,
  mockCreatePending,
  mockMarkAsProcessing,
  mockUpdateContent,
  mockMarkAsFailed,
  mockLog,
} = vi.hoisted(() => ({
  mockScrape: vi.fn(),
  mockPublish: vi.fn(),
  mockFindByBookmarkId: vi.fn(),
  mockCreatePending: vi.fn(),
  mockMarkAsProcessing: vi.fn(),
  mockUpdateContent: vi.fn(),
  mockMarkAsFailed: vi.fn(),
  mockLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock modules before imports
vi.mock("encore.dev/log", () => ({
  default: mockLog,
}));

// Mock the db instance to ensure true isolation
vi.mock("../../db", () => ({
  db: {
    query: vi.fn(),
    queryRow: vi.fn(),
    exec: vi.fn(),
  },
}));

vi.mock("encore.dev/config", () => ({
  secret: () => () => "mock-firecrawl-api-key",
}));

vi.mock("../../services/firecrawl.service", () => ({
  FirecrawlService: class MockFirecrawlService {
    scrape = mockScrape;
  },
}));

vi.mock("../../repositories/web-content.repository", () => ({
  WebContentRepository: class MockWebContentRepository {
    findByBookmarkId = mockFindByBookmarkId;
    findByBookmarkIdInternal = mockFindByBookmarkId; // Use same mock for internal variant
    createPending = mockCreatePending;
    markAsProcessing = mockMarkAsProcessing;
    updateContent = mockUpdateContent;
    markAsFailed = mockMarkAsFailed;
  },
}));

vi.mock("../../events/content-extracted.events", () => ({
  contentExtractedTopic: {
    publish: mockPublish,
  },
}));

// Import after mocks
import { handleContentExtraction } from "../../processors/content-extraction.processor";

describe("Content Extraction Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Source Filtering", () => {
    it("should skip YouTube sources", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 1,
        source: BookmarkSource.YOUTUBE,
        url: "https://www.youtube.com/watch?v=test",
        title: "Test Video",
      };

      await handleContentExtraction(event);

      expect(mockScrape).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
      // BaseProcessor logs with processor name prefix
      expect(mockLog.info).toHaveBeenCalledWith(
        "Content Extraction Processor: Skipping content extraction for non-textual source",
        expect.objectContaining({
          bookmarkId: 1,
          source: BookmarkSource.YOUTUBE,
        })
      );
    });

    it("should skip Podcast sources", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 2,
        source: BookmarkSource.PODCAST,
        url: "https://podcast.example.com/episode",
        title: "Test Podcast",
      };

      await handleContentExtraction(event);

      expect(mockScrape).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("should process blog sources", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 3,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/article",
        title: "Test Blog",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 3, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "# Blog Content",
          html: "<h1>Blog Content</h1>",
          metadata: { title: "Blog", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-1");

      await handleContentExtraction(event);

      expect(mockScrape).toHaveBeenCalledWith(event.url);
      expect(mockPublish).toHaveBeenCalled();
    });

    it("should process web sources", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 4,
        source: BookmarkSource.WEB,
        url: "https://example.com/page",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 4, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "Web content",
          html: "<p>Web content</p>",
          metadata: { title: "Web Page", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-2");

      await handleContentExtraction(event);

      expect(mockScrape).toHaveBeenCalledWith(event.url);
      expect(mockPublish).toHaveBeenCalled();
    });

    it("should process Reddit sources", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 5,
        source: BookmarkSource.REDDIT,
        url: "https://reddit.com/r/test/comments/123",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 5, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "Reddit post",
          html: "<p>Reddit post</p>",
          metadata: { title: "Reddit", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-3");

      await handleContentExtraction(event);

      expect(mockScrape).toHaveBeenCalled();
    });

    it("should process Twitter sources", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 6,
        source: BookmarkSource.TWITTER,
        url: "https://twitter.com/user/status/123",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 6, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "Tweet",
          html: "<p>Tweet</p>",
          metadata: { title: "Twitter", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-4");

      await handleContentExtraction(event);

      expect(mockScrape).toHaveBeenCalled();
    });

    it("should process LinkedIn sources", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 7,
        source: BookmarkSource.LINKEDIN,
        url: "https://linkedin.com/pulse/test-article",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 7, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "LinkedIn article",
          html: "<p>LinkedIn article</p>",
          metadata: { title: "LinkedIn", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-5");

      await handleContentExtraction(event);

      expect(mockScrape).toHaveBeenCalled();
    });
  });

  describe("Idempotency", () => {
    it("should skip if already processing", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 10,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/test",
      };

      mockFindByBookmarkId.mockResolvedValue({
        id: 1,
        bookmark_id: 10,
        status: ContentStatus.PROCESSING,
      });

      await handleContentExtraction(event);

      expect(mockScrape).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        "Content already processed or in progress, skipping",
        expect.objectContaining({
          bookmarkId: 10,
          currentStatus: ContentStatus.PROCESSING,
        })
      );
    });

    it("should skip if already completed", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 11,
        source: BookmarkSource.WEB,
        url: "https://example.com/page",
      };

      mockFindByBookmarkId.mockResolvedValue({
        id: 1,
        bookmark_id: 11,
        status: ContentStatus.COMPLETED,
        raw_markdown: "Existing content",
      });

      await handleContentExtraction(event);

      expect(mockScrape).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("should reprocess if pending", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 12,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/article",
      };

      mockFindByBookmarkId.mockResolvedValue({
        id: 1,
        bookmark_id: 12,
        status: ContentStatus.PENDING,
      });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "Retry content",
          html: "<p>Retry content</p>",
          metadata: { title: "Retry", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-6");

      await handleContentExtraction(event);

      expect(mockScrape).toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalled();
    });
  });

  describe("Content Extraction", () => {
    it("should extract and store content successfully", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 20,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/article",
        title: "Test Article",
      };

      const markdown = "# Test Article\n\nThis is a test article with some content.";
      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 20, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown,
          html: "<h1>Test Article</h1><p>This is a test article with some content.</p>",
          metadata: {
            title: "Test Article Title",
            description: "Test description",
            language: "en",
            keywords: "test, article",
          },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-7");

      await handleContentExtraction(event);

      expect(mockCreatePending).toHaveBeenCalledWith(20);
      expect(mockMarkAsProcessing).toHaveBeenCalledWith(20);
      expect(mockScrape).toHaveBeenCalledWith("https://blog.example.com/article");
      expect(mockUpdateContent).toHaveBeenCalledWith(
        20,
        expect.objectContaining({
          raw_markdown: markdown,
          page_title: "Test Article Title",
          page_description: "Test description",
          language: "en",
          word_count: expect.any(Number),
          char_count: markdown.length,
          estimated_reading_minutes: expect.any(Number),
        })
      );
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 20,
        content: markdown,
        wordCount: expect.any(Number),
        source: BookmarkSource.BLOG,
      });
    });

    it("should use fallback title if metadata title is empty", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 21,
        source: BookmarkSource.WEB,
        url: "https://example.com/page",
        title: "Fallback Title",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 21, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "Content",
          html: "<p>Content</p>",
          metadata: { title: "", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-8");

      await handleContentExtraction(event);

      expect(mockUpdateContent).toHaveBeenCalledWith(
        21,
        expect.objectContaining({
          page_title: "Fallback Title",
        })
      );
    });

    it("should use 'Untitled' if no title available", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 22,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/no-title",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 22, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "Content",
          html: "<p>Content</p>",
          metadata: { title: "", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-9");

      await handleContentExtraction(event);

      expect(mockUpdateContent).toHaveBeenCalledWith(
        22,
        expect.objectContaining({
          page_title: "Untitled",
        })
      );
    });

    it("should calculate word count and reading time correctly", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 23,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/article",
      };

      // 250 words = ~2 minutes at 200 WPM
      const words = Array(250).fill("word").join(" ");
      const markdown = `# Title\n\n${words}`;

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 23, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown,
          html: "<p>...</p>",
          metadata: { title: "Test", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-10");

      await handleContentExtraction(event);

      expect(mockUpdateContent).toHaveBeenCalledWith(
        23,
        expect.objectContaining({
          word_count: 252, // 250 words + "Title"
          char_count: markdown.length,
          estimated_reading_minutes: 2, // ceil(252 / 200)
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle FireCrawl API errors", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 30,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/error",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 30, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockRejectedValue(new Error("FireCrawl API error: 500"));
      mockMarkAsFailed.mockResolvedValue(undefined);

      // BaseProcessor re-throws errors
      await expect(handleContentExtraction(event)).rejects.toThrow(
        "Content Extraction Processor failed: FireCrawl API error: 500"
      );

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        30,
        "Extraction failed: FireCrawl API error: 500"
      );
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("should handle missing markdown in response", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 31,
        source: BookmarkSource.WEB,
        url: "https://example.com/no-markdown",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 31, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: null,
          html: "<p>HTML only</p>",
          metadata: { title: "", description: "", language: "en" },
        },
      });
      mockMarkAsFailed.mockResolvedValue(undefined);

      // BaseProcessor re-throws errors
      await expect(handleContentExtraction(event)).rejects.toThrow(
        /Content Extraction Processor failed:.*missing markdown/
      );

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        31,
        expect.stringContaining("missing markdown")
      );
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("should handle unsuccessful FireCrawl response", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 32,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/unsuccessful",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 32, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: false,
        data: {
          markdown: null,
          html: null,
          metadata: {},
        },
      });
      mockMarkAsFailed.mockResolvedValue(undefined);

      // BaseProcessor re-throws errors
      await expect(handleContentExtraction(event)).rejects.toThrow(
        /Content Extraction Processor failed:.*unsuccessful response/
      );

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        32,
        expect.stringContaining("unsuccessful response")
      );
    });

    it("should handle non-Error exceptions", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 33,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/string-error",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 33, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockRejectedValue("String error");
      mockMarkAsFailed.mockResolvedValue(undefined);

      // BaseProcessor re-throws errors
      await expect(handleContentExtraction(event)).rejects.toThrow(
        "Content Extraction Processor failed: String error"
      );

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        33,
        "Extraction failed: String error"
      );
    });
  });

  describe("Logging and Observability", () => {
    it("should log successful extraction", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 40,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/logging-test",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 40, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "Test content",
          html: "<p>Test content</p>",
          metadata: { title: "Test", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("message-id-11");

      await handleContentExtraction(event);

      expect(mockLog.info).toHaveBeenCalledWith(
        "Starting content extraction",
        expect.objectContaining({
          bookmarkId: 40,
          url: "https://blog.example.com/logging-test",
          source: BookmarkSource.BLOG,
        })
      );

      expect(mockLog.info).toHaveBeenCalledWith(
        "Content extraction completed successfully",
        expect.objectContaining({
          bookmarkId: 40,
          wordCount: expect.any(Number),
          pageTitle: "Test",
        })
      );
    });

    it("should log errors on failure", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 41,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/error-logging",
      };

      const error = new Error("Test error");
      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 41, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockRejectedValue(error);
      mockMarkAsFailed.mockResolvedValue(undefined);

      // BaseProcessor re-throws errors
      await expect(handleContentExtraction(event)).rejects.toThrow(
        "Content Extraction Processor failed: Test error"
      );

      // BaseProcessor logs with processor name prefix
      expect(mockLog.error).toHaveBeenCalledWith(
        error,
        "Content Extraction Processor failed",
        expect.objectContaining({
          event,
          errorMessage: "Test error",
        })
      );
    });
  });

  describe("Handler Function", () => {
    it("should export handler function", () => {
      expect(handleContentExtraction).toBeDefined();
      expect(typeof handleContentExtraction).toBe("function");
    });
  });

  /**
   * INTEGRATION TESTS: Enhanced Idempotency & State Transitions
   * These tests verify processor behavior with focus on state management
   */
  describe("Idempotency (Integration - Enhanced)", () => {
    it("should skip processing when content is already completed", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 1000,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/completed",
        title: "Already Completed",
      };

      // Content already completed
      mockFindByBookmarkId.mockResolvedValue({
        id: 1,
        bookmark_id: 1000,
        status: ContentStatus.COMPLETED,
        raw_markdown: "Existing content",
      });

      await handleContentExtraction(event);

      // Should skip processing entirely
      expect(mockCreatePending).not.toHaveBeenCalled();
      expect(mockMarkAsProcessing).not.toHaveBeenCalled();
      expect(mockScrape).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("should handle concurrent duplicate events gracefully", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 1001,
        source: BookmarkSource.WEB,
        url: "https://example.com/concurrent",
      };

      // First call: no existing record
      // Second call: record exists with 'processing' status
      mockFindByBookmarkId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, bookmark_id: 1001, status: ContentStatus.PROCESSING });

      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 1001, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "Concurrent content",
          html: "<p>Concurrent content</p>",
          metadata: { title: "Concurrent", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-concurrent");

      // Process same event twice simultaneously
      const results = await Promise.all([
        handleContentExtraction(event),
        handleContentExtraction(event),
      ]);

      // First should process, second should skip
      expect(mockFindByBookmarkId).toHaveBeenCalledTimes(2);
      expect(mockCreatePending).toHaveBeenCalledTimes(1); // Only first call
    });
  });

  describe("State Transitions (Integration)", () => {
    it("should transition: pending → processing → completed", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 2000,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/state-test",
        title: "State Test",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 2000, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "# State Test Content",
          html: "<h1>State Test Content</h1>",
          metadata: { title: "State Test", description: "Test", language: "en" },
        },
      });
      mockUpdateContent.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-state");

      await handleContentExtraction(event);

      // Verify state transitions
      expect(mockCreatePending).toHaveBeenCalledWith(2000); // pending
      expect(mockMarkAsProcessing).toHaveBeenCalledWith(2000); // processing
      expect(mockUpdateContent).toHaveBeenCalled(); // stores data (completed)
    });

    it("should transition to 'failed' on scraping error", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 2001,
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com/fail-test",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue({ id: 1, bookmark_id: 2001, status: ContentStatus.PENDING });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockScrape.mockRejectedValue(new Error("Firecrawl API error"));
      mockMarkAsFailed.mockResolvedValue(undefined);

      await handleContentExtraction(event);

      // Should mark as failed
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        2001,
        "Extraction failed: Firecrawl API error"
      );
    });

    it("should persist state before publishing next event", async () => {
      const event: BookmarkSourceClassifiedEvent = {
        bookmarkId: 2002,
        source: BookmarkSource.WEB,
        url: "https://example.com/order-test",
      };

      let createPendingCalled = false;
      let markAsProcessingCalled = false;
      let updateContentCalled = false;
      let publishCalled = false;

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockImplementation(async () => {
        createPendingCalled = true;
        return { id: 1, bookmark_id: 2002, status: ContentStatus.PENDING };
      });
      mockMarkAsProcessing.mockImplementation(async () => {
        markAsProcessingCalled = true;
        expect(createPendingCalled).toBe(true);
      });
      mockScrape.mockResolvedValue({
        success: true,
        data: {
          markdown: "Order test",
          html: "<p>Order test</p>",
          metadata: { title: "Order", description: "", language: "en" },
        },
      });
      mockUpdateContent.mockImplementation(async () => {
        updateContentCalled = true;
        expect(markAsProcessingCalled).toBe(true);
        expect(publishCalled).toBe(false);
      });
      mockPublish.mockImplementation(async () => {
        publishCalled = true;
        expect(updateContentCalled).toBe(true);
        return "msg-order";
      });

      await handleContentExtraction(event);

      // Verify execution order
      expect(createPendingCalled).toBe(true);
      expect(markAsProcessingCalled).toBe(true);
      expect(updateContentCalled).toBe(true);
      expect(publishCalled).toBe(true);
    });
  });
});
