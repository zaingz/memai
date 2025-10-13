/**
 * Bookmark Classification Processor Tests
 *
 * Unit tests for the bookmark classification processor that:
 * - Classifies bookmark URLs and updates source
 * - Publishes bookmark-source-classified events
 * - Handles errors and retry scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookmarkSource } from "../../types/domain.types";

// Hoist mock functions for use in module mocks
const {
  mockUpdateSource,
  mockClassifyBookmarkUrl,
  mockPublish,
  mockLog,
} = vi.hoisted(() => ({
  mockUpdateSource: vi.fn(),
  mockClassifyBookmarkUrl: vi.fn(),
  mockPublish: vi.fn(),
  mockLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
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

vi.mock("../../repositories/bookmark.repository", () => ({
  BookmarkRepository: class MockBookmarkRepository {
    updateSource = mockUpdateSource;
  },
}));

vi.mock("../../utils/bookmark-classifier.util", () => ({
  classifyBookmarkUrl: mockClassifyBookmarkUrl,
}));

vi.mock("../../events/bookmark-source-classified.events", () => ({
  bookmarkSourceClassifiedTopic: {
    publish: mockPublish,
  },
}));

// Import after mocks
import { handleBookmarkClassification } from "../../processors/bookmark-classification.processor";

describe("Bookmark Classification Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Classification Logic", () => {
    it("should classify URL when source is 'web'", async () => {
      const event = {
        bookmarkId: 1,
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        source: BookmarkSource.WEB,
        title: "Test Video",
      };

      mockClassifyBookmarkUrl.mockReturnValue(BookmarkSource.YOUTUBE);
      mockUpdateSource.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-123");

      await handleBookmarkClassification(event);

      expect(mockClassifyBookmarkUrl).toHaveBeenCalledWith(event.url);
      expect(mockUpdateSource).toHaveBeenCalledWith(1, BookmarkSource.YOUTUBE);
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 1,
        source: BookmarkSource.YOUTUBE,
        url: event.url,
        title: event.title,
      });
    });

    it("should skip classification when source is already known", async () => {
      const event = {
        bookmarkId: 2,
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        source: BookmarkSource.YOUTUBE,
        title: "Test Video",
      };

      mockPublish.mockResolvedValue("msg-456");

      await handleBookmarkClassification(event);

      expect(mockClassifyBookmarkUrl).not.toHaveBeenCalled();
      expect(mockUpdateSource).not.toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 2,
        source: BookmarkSource.YOUTUBE,
        url: event.url,
        title: event.title,
      });
    });

    it("should not update source if classification returns 'web'", async () => {
      const event = {
        bookmarkId: 3,
        url: "https://example.com/article",
        source: BookmarkSource.WEB,
      };

      mockClassifyBookmarkUrl.mockReturnValue(BookmarkSource.WEB);
      mockPublish.mockResolvedValue("msg-789");

      await handleBookmarkClassification(event);

      expect(mockClassifyBookmarkUrl).toHaveBeenCalledWith(event.url);
      expect(mockUpdateSource).not.toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 3,
        source: BookmarkSource.WEB,
        url: event.url,
        title: undefined,
      });
    });
  });

  describe("Repository Update", () => {
    it("should handle repository update failure gracefully", async () => {
      const event = {
        bookmarkId: 4,
        url: "https://podcasts.apple.com/podcast/id123",
        source: BookmarkSource.WEB,
      };

      mockClassifyBookmarkUrl.mockReturnValue(BookmarkSource.PODCAST);
      mockUpdateSource.mockRejectedValue(new Error("Database error"));
      mockPublish.mockResolvedValue("msg-abc");

      // Should not throw, continues with original source
      await handleBookmarkClassification(event);

      expect(mockUpdateSource).toHaveBeenCalledWith(4, BookmarkSource.PODCAST);
      // Should still publish event, but with original source since update failed
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 4,
        source: BookmarkSource.WEB, // Falls back to original
        url: event.url,
        title: undefined,
      });
    });

    it("should update to detected source on successful classification", async () => {
      const event = {
        bookmarkId: 5,
        url: "https://www.reddit.com/r/programming/comments/abc",
        source: BookmarkSource.WEB,
        title: "Programming Discussion",
      };

      mockClassifyBookmarkUrl.mockReturnValue(BookmarkSource.REDDIT);
      mockUpdateSource.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-def");

      await handleBookmarkClassification(event);

      expect(mockUpdateSource).toHaveBeenCalledWith(5, BookmarkSource.REDDIT);
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 5,
        source: BookmarkSource.REDDIT,
        url: event.url,
        title: event.title,
      });
    });
  });

  describe("Event Publishing", () => {
    it("should publish bookmark-source-classified event with correct data", async () => {
      const event = {
        bookmarkId: 6,
        url: "https://twitter.com/user/status/123",
        source: BookmarkSource.TWITTER,
        title: "Tweet",
      };

      mockPublish.mockResolvedValue("msg-ghi");

      await handleBookmarkClassification(event);

      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 6,
        source: BookmarkSource.TWITTER,
        url: "https://twitter.com/user/status/123",
        title: "Tweet",
      });
    });

    it("should throw error when event publishing fails", async () => {
      const event = {
        bookmarkId: 7,
        url: "https://example.com",
        source: BookmarkSource.WEB,
      };

      mockPublish.mockRejectedValue(new Error("Topic publish failed"));

      await expect(handleBookmarkClassification(event)).rejects.toThrow("Topic publish failed");

      expect(mockPublish).toHaveBeenCalled();
    });

    it("should publish event with undefined title when not provided", async () => {
      const event = {
        bookmarkId: 8,
        url: "https://linkedin.com/in/profile",
        source: BookmarkSource.LINKEDIN,
        // title is undefined
      };

      mockPublish.mockResolvedValue("msg-jkl");

      await handleBookmarkClassification(event);

      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 8,
        source: BookmarkSource.LINKEDIN,
        url: event.url,
        title: undefined,
      });
    });
  });

  describe("Different Source Types", () => {
    const sourceTestCases = [
      {
        source: BookmarkSource.YOUTUBE,
        url: "https://www.youtube.com/watch?v=xyz",
        shouldClassify: false,
      },
      {
        source: BookmarkSource.PODCAST,
        url: "https://podcasts.apple.com/podcast/id456",
        shouldClassify: false,
      },
      {
        source: BookmarkSource.REDDIT,
        url: "https://www.reddit.com/r/test",
        shouldClassify: false,
      },
      {
        source: BookmarkSource.TWITTER,
        url: "https://twitter.com/test",
        shouldClassify: false,
      },
      {
        source: BookmarkSource.LINKEDIN,
        url: "https://linkedin.com/test",
        shouldClassify: false,
      },
      {
        source: BookmarkSource.BLOG,
        url: "https://blog.example.com",
        shouldClassify: false,
      },
      {
        source: BookmarkSource.WEB,
        url: "https://example.com",
        shouldClassify: true,
      },
    ];

    sourceTestCases.forEach(({ source, url, shouldClassify }) => {
      it(`should ${shouldClassify ? "classify" : "skip classification for"} ${source} source`, async () => {
        const event = {
          bookmarkId: 100,
          url,
          source,
        };

        if (shouldClassify) {
          mockClassifyBookmarkUrl.mockReturnValue(BookmarkSource.BLOG);
          mockUpdateSource.mockResolvedValue(undefined);
        }

        mockPublish.mockResolvedValue("msg-test");

        await handleBookmarkClassification(event);

        if (shouldClassify) {
          expect(mockClassifyBookmarkUrl).toHaveBeenCalledWith(url);
        } else {
          expect(mockClassifyBookmarkUrl).not.toHaveBeenCalled();
          expect(mockUpdateSource).not.toHaveBeenCalled();
        }

        expect(mockPublish).toHaveBeenCalled();
      });
    });
  });

  describe("Error Scenarios", () => {
    it("should continue processing if classification throws error", async () => {
      const event = {
        bookmarkId: 9,
        url: "https://malformed-url",
        source: BookmarkSource.WEB,
      };

      mockClassifyBookmarkUrl.mockImplementation(() => {
        throw new Error("Invalid URL");
      });

      // Should throw and not reach publish
      await expect(handleBookmarkClassification(event)).rejects.toThrow();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("should handle concurrent classification requests", async () => {
      const events = [
        {
          bookmarkId: 10,
          url: "https://www.youtube.com/watch?v=1",
          source: BookmarkSource.WEB,
        },
        {
          bookmarkId: 11,
          url: "https://www.youtube.com/watch?v=2",
          source: BookmarkSource.WEB,
        },
        {
          bookmarkId: 12,
          url: "https://www.youtube.com/watch?v=3",
          source: BookmarkSource.WEB,
        },
      ];

      mockClassifyBookmarkUrl.mockReturnValue(BookmarkSource.YOUTUBE);
      mockUpdateSource.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-concurrent");

      await Promise.all(events.map((event) => handleBookmarkClassification(event)));

      expect(mockClassifyBookmarkUrl).toHaveBeenCalledTimes(3);
      expect(mockUpdateSource).toHaveBeenCalledTimes(3);
      expect(mockPublish).toHaveBeenCalledTimes(3);
    });
  });

  describe("Handler Function", () => {
    it("should export handler function", () => {
      expect(handleBookmarkClassification).toBeDefined();
      expect(typeof handleBookmarkClassification).toBe("function");
    });
  });

  describe("Logging and Observability", () => {
    it("should log classification success", async () => {
      const event = {
        bookmarkId: 100,
        url: "https://www.youtube.com/watch?v=test",
        source: BookmarkSource.WEB,
      };

      mockClassifyBookmarkUrl.mockReturnValue(BookmarkSource.YOUTUBE);
      mockUpdateSource.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-123");

      await handleBookmarkClassification(event);

      expect(mockLog.info).toHaveBeenCalledWith(
        "URL classification completed",
        expect.objectContaining({
          bookmarkId: 100,
          detectedSource: BookmarkSource.YOUTUBE,
        })
      );
    });

    it("should log errors when repository update fails", async () => {
      const event = {
        bookmarkId: 101,
        url: "https://example.com",
        source: BookmarkSource.WEB,
      };

      const dbError = new Error("Connection refused");
      mockClassifyBookmarkUrl.mockReturnValue(BookmarkSource.BLOG);
      mockUpdateSource.mockRejectedValue(dbError);
      mockPublish.mockResolvedValue("msg");

      await handleBookmarkClassification(event);

      expect(mockLog.error).toHaveBeenCalledWith(
        dbError,
        "Failed to update bookmark source",
        expect.objectContaining({
          bookmarkId: 101,
          detectedSource: BookmarkSource.BLOG,
        })
      );
    });

    it("should log errors when event publishing fails", async () => {
      const event = {
        bookmarkId: 102,
        url: "https://example.com",
        source: BookmarkSource.YOUTUBE,
      };

      const pubsubError = new Error("Topic publish failed");
      mockPublish.mockRejectedValue(pubsubError);

      await expect(handleBookmarkClassification(event)).rejects.toThrow();

      expect(mockLog.error).toHaveBeenCalledWith(
        pubsubError,
        "Failed to publish bookmark-source-classified event",
        expect.objectContaining({
          bookmarkId: 102,
        })
      );
    });
  });
});
