/**
 * Content Summary Processor Tests
 *
 * Unit tests for the content summary processor that:
 * - Classifies content type based on word count
 * - Generates summaries using OpenAI with appropriate token limits
 * - Stores summaries in web_contents table
 * - Handles errors gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookmarkSource } from "../../types/domain.types";
import { ContentType } from "../../types/web-content.types";

// Hoist mock functions for use in module mocks
const {
  mockGenerateSummary,
  mockUpdateSummary,
  mockMarkAsCompleted,
  mockMarkAsFailed,
  mockGetContentType,
  mockLog,
} = vi.hoisted(() => ({
  mockGenerateSummary: vi.fn(),
  mockUpdateSummary: vi.fn(),
  mockMarkAsCompleted: vi.fn(),
  mockMarkAsFailed: vi.fn(),
  mockGetContentType: vi.fn(),
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

vi.mock("encore.dev/config", () => ({
  secret: () => () => "mock-openai-api-key",
}));

vi.mock("../../services/openai.service", () => ({
  OpenAIService: class MockOpenAIService {
    generateSummary = mockGenerateSummary;
  },
}));

vi.mock("../../repositories/web-content.repository", () => ({
  WebContentRepository: class MockWebContentRepository {
    updateSummary = mockUpdateSummary;
    markAsCompleted = mockMarkAsCompleted;
    markAsFailed = mockMarkAsFailed;
  },
}));

vi.mock("../../config/firecrawl.config", () => ({
  getContentType: mockGetContentType,
}));

// Import after mocks
import { handleContentSummary } from "../../processors/content-summary.processor";

describe("Content Summary Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Content Type Classification", () => {
    it("should classify as short_post for content under 500 words", async () => {
      const event = {
        bookmarkId: 1,
        content: "Short tweet content.",
        wordCount: 50,
        source: BookmarkSource.TWITTER,
      };

      mockGetContentType.mockReturnValue("short_post" as ContentType);
      mockGenerateSummary.mockResolvedValue("Brief summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGetContentType).toHaveBeenCalledWith(50);
      expect(mockGenerateSummary).toHaveBeenCalledWith(
        event.content,
        BookmarkSource.TWITTER,
        { maxTokens: 150, contentType: "short_post" }
      );
    });

    it("should classify as article for content between 500-2000 words", async () => {
      const event = {
        bookmarkId: 2,
        content: "Standard blog article content.",
        wordCount: 1000,
        source: BookmarkSource.BLOG,
      };

      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockResolvedValue("Article summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGetContentType).toHaveBeenCalledWith(1000);
      expect(mockGenerateSummary).toHaveBeenCalledWith(
        event.content,
        BookmarkSource.BLOG,
        { maxTokens: 300, contentType: "article" }
      );
    });

    it("should classify as long_form for content over 2000 words", async () => {
      const event = {
        bookmarkId: 3,
        content: "Long-form essay content.",
        wordCount: 5000,
        source: BookmarkSource.BLOG,
      };

      mockGetContentType.mockReturnValue("long_form" as ContentType);
      mockGenerateSummary.mockResolvedValue("Comprehensive summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGetContentType).toHaveBeenCalledWith(5000);
      expect(mockGenerateSummary).toHaveBeenCalledWith(
        event.content,
        BookmarkSource.BLOG,
        { maxTokens: 500, contentType: "long_form" }
      );
    });
  });

  describe("Token Limit Selection", () => {
    it("should use 150 tokens for short_post", async () => {
      const event = {
        bookmarkId: 4,
        content: "Tweet content",
        wordCount: 50,
        source: BookmarkSource.TWITTER,
      };

      mockGetContentType.mockReturnValue("short_post" as ContentType);
      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ maxTokens: 150 })
      );
    });

    it("should use 300 tokens for article", async () => {
      const event = {
        bookmarkId: 5,
        content: "Blog article",
        wordCount: 1000,
        source: BookmarkSource.BLOG,
      };

      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ maxTokens: 300 })
      );
    });

    it("should use 500 tokens for long_form", async () => {
      const event = {
        bookmarkId: 6,
        content: "Long essay",
        wordCount: 3000,
        source: BookmarkSource.WEB,
      };

      mockGetContentType.mockReturnValue("long_form" as ContentType);
      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ maxTokens: 500 })
      );
    });
  });

  describe("OpenAI Summary Generation", () => {
    it("should generate summary for blog post", async () => {
      const event = {
        bookmarkId: 7,
        content: "Blog post about AI developments and their impact on society.",
        wordCount: 800,
        source: BookmarkSource.BLOG,
      };

      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockResolvedValue("Summary: AI impact on society");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        event.content,
        BookmarkSource.BLOG,
        { maxTokens: 300, contentType: "article" }
      );
    });

    it("should generate summary for Reddit post", async () => {
      const event = {
        bookmarkId: 8,
        content: "Reddit discussion thread content",
        wordCount: 450,
        source: BookmarkSource.REDDIT,
      };

      mockGetContentType.mockReturnValue("short_post" as ContentType);
      mockGenerateSummary.mockResolvedValue("Reddit discussion summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        event.content,
        BookmarkSource.REDDIT,
        { maxTokens: 150, contentType: "short_post" }
      );
    });

    it("should generate summary for LinkedIn article", async () => {
      const event = {
        bookmarkId: 9,
        content: "LinkedIn professional insights article",
        wordCount: 1200,
        source: BookmarkSource.LINKEDIN,
      };

      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockResolvedValue("Professional insights summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        event.content,
        BookmarkSource.LINKEDIN,
        { maxTokens: 300, contentType: "article" }
      );
    });

    it("should handle OpenAI API failure", async () => {
      const event = {
        bookmarkId: 10,
        content: "Test content",
        wordCount: 500,
        source: BookmarkSource.BLOG,
      };

      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockRejectedValue(new Error("OpenAI API rate limit exceeded"));

      await handleContentSummary(event);

      expect(mockUpdateSummary).not.toHaveBeenCalled();
      expect(mockMarkAsCompleted).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        10,
        "Summarization failed: OpenAI API rate limit exceeded"
      );
    });
  });

  describe("Database Storage", () => {
    it("should store summary in database", async () => {
      const event = {
        bookmarkId: 11,
        content: "Content to summarize",
        wordCount: 700,
        source: BookmarkSource.BLOG,
      };

      const generatedSummary = "Generated summary with key insights";
      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockResolvedValue(generatedSummary);
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockUpdateSummary).toHaveBeenCalledWith(11, generatedSummary);
      expect(mockUpdateSummary).toHaveBeenCalledTimes(1);
    });

    it("should mark as completed after storing summary", async () => {
      const event = {
        bookmarkId: 12,
        content: "Test content",
        wordCount: 600,
        source: BookmarkSource.WEB,
      };

      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockMarkAsCompleted).toHaveBeenCalledWith(12);
      expect(mockMarkAsCompleted).toHaveBeenCalledTimes(1);
    });

    it("should handle database update failure", async () => {
      const event = {
        bookmarkId: 13,
        content: "Test content",
        wordCount: 500,
        source: BookmarkSource.BLOG,
      };

      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockRejectedValue(new Error("Database connection failed"));

      await handleContentSummary(event);

      expect(mockMarkAsCompleted).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        13,
        "Summarization failed: Database connection failed"
      );
    });
  });

  describe("Error Handling", () => {
    it("should mark as failed on generation error", async () => {
      const event = {
        bookmarkId: 14,
        content: "Error content",
        wordCount: 500,
        source: BookmarkSource.BLOG,
      };

      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockRejectedValue(new Error("Generation failed"));

      await handleContentSummary(event);

      expect(mockUpdateSummary).not.toHaveBeenCalled();
      expect(mockMarkAsCompleted).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        14,
        "Summarization failed: Generation failed"
      );
    });

    it("should mark as failed on storage error", async () => {
      const event = {
        bookmarkId: 15,
        content: "Storage error content",
        wordCount: 600,
        source: BookmarkSource.BLOG,
      };

      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockRejectedValue(new Error("Storage failed"));

      await handleContentSummary(event);

      expect(mockMarkAsCompleted).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        15,
        "Summarization failed: Storage failed"
      );
    });

    it("should handle non-Error exceptions", async () => {
      const event = {
        bookmarkId: 16,
        content: "Exception test",
        wordCount: 400,
        source: BookmarkSource.TWITTER,
      };

      mockGetContentType.mockReturnValue("short_post" as ContentType);
      mockGenerateSummary.mockRejectedValue("String error");

      await handleContentSummary(event);

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        16,
        "Summarization failed: String error"
      );
    });
  });

  describe("Different Content Lengths", () => {
    it("should handle very short content", async () => {
      const event = {
        bookmarkId: 17,
        content: "Short.",
        wordCount: 10,
        source: BookmarkSource.TWITTER,
      };

      mockGetContentType.mockReturnValue("short_post" as ContentType);
      mockGenerateSummary.mockResolvedValue("Very brief summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        "Short.",
        BookmarkSource.TWITTER,
        { maxTokens: 150, contentType: "short_post" }
      );
    });

    it("should handle very long content", async () => {
      const event = {
        bookmarkId: 18,
        content: "Very long content ".repeat(500),
        wordCount: 10000,
        source: BookmarkSource.BLOG,
      };

      mockGetContentType.mockReturnValue("long_form" as ContentType);
      mockGenerateSummary.mockResolvedValue("Comprehensive summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        expect.any(String),
        BookmarkSource.BLOG,
        { maxTokens: 500, contentType: "long_form" }
      );
    });
  });

  describe("Concurrent Processing", () => {
    it("should handle concurrent summary generation requests", async () => {
      const events = [
        {
          bookmarkId: 19,
          content: "Blog content 1",
          wordCount: 800,
          source: BookmarkSource.BLOG,
        },
        {
          bookmarkId: 20,
          content: "Twitter content 2",
          wordCount: 50,
          source: BookmarkSource.TWITTER,
        },
        {
          bookmarkId: 21,
          content: "LinkedIn content 3",
          wordCount: 1500,
          source: BookmarkSource.LINKEDIN,
        },
      ];

      mockGetContentType
        .mockReturnValueOnce("article" as ContentType)
        .mockReturnValueOnce("short_post" as ContentType)
        .mockReturnValueOnce("article" as ContentType);

      mockGenerateSummary
        .mockResolvedValueOnce("Blog summary")
        .mockResolvedValueOnce("Twitter summary")
        .mockResolvedValueOnce("LinkedIn summary");

      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await Promise.all(events.map((event) => handleContentSummary(event)));

      expect(mockGenerateSummary).toHaveBeenCalledTimes(3);
      expect(mockUpdateSummary).toHaveBeenCalledTimes(3);
      expect(mockMarkAsCompleted).toHaveBeenCalledTimes(3);
    });
  });

  describe("Logging and Observability", () => {
    it("should log successful summary generation", async () => {
      const event = {
        bookmarkId: 100,
        content: "Logging test content",
        wordCount: 700,
        source: BookmarkSource.BLOG,
      };

      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockResolvedValue("Generated summary");
      mockUpdateSummary.mockResolvedValue(undefined);
      mockMarkAsCompleted.mockResolvedValue(undefined);

      await handleContentSummary(event);

      expect(mockLog.info).toHaveBeenCalledWith(
        "Starting content summarization",
        expect.objectContaining({
          bookmarkId: 100,
          wordCount: 700,
          source: BookmarkSource.BLOG,
        })
      );

      expect(mockLog.info).toHaveBeenCalledWith(
        "Content type classified",
        expect.objectContaining({
          bookmarkId: 100,
          contentType: "article",
          wordCount: 700,
        })
      );

      expect(mockLog.info).toHaveBeenCalledWith(
        "Summary generated successfully",
        expect.objectContaining({
          bookmarkId: 100,
          summaryLength: expect.any(Number),
          contentType: "article",
        })
      );

      expect(mockLog.info).toHaveBeenCalledWith(
        "Content summarization completed",
        expect.objectContaining({
          bookmarkId: 100,
          summaryLength: expect.any(Number),
        })
      );
    });

    it("should log errors when OpenAI fails", async () => {
      const event = {
        bookmarkId: 101,
        content: "Error test",
        wordCount: 500,
        source: BookmarkSource.BLOG,
      };

      const openaiError = new Error("OpenAI API rate limit exceeded");
      mockGetContentType.mockReturnValue("article" as ContentType);
      mockGenerateSummary.mockRejectedValue(openaiError);

      await handleContentSummary(event);

      expect(mockLog.error).toHaveBeenCalledWith(
        openaiError,
        "Content summarization failed",
        expect.objectContaining({
          bookmarkId: 101,
          wordCount: 500,
          source: BookmarkSource.BLOG,
        })
      );
    });
  });

  describe("Handler Function", () => {
    it("should export handler function", () => {
      expect(handleContentSummary).toBeDefined();
      expect(typeof handleContentSummary).toBe("function");
    });
  });
});
