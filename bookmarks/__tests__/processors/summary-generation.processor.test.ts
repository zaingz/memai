/**
 * Summary Generation Processor Tests
 *
 * Unit tests for the summary generation processor that:
 * - Selects source-specific prompts
 * - Generates summaries using OpenAI
 * - Stores summaries and marks as completed
 * - Handles errors gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookmarkSource } from "../../types/domain.types";

// Hoist mock functions for use in module mocks
const {
  mockGenerateSummary,
  mockUpdateSummary,
  mockMarkAsFailed,
  mockSummaryPromptsYouTube,
  mockSummaryPromptsPodcast,
  mockSummaryPromptsOther,
  mockDefaultPrompt,
  mockLog,
} = vi.hoisted(() => ({
  mockGenerateSummary: vi.fn(),
  mockUpdateSummary: vi.fn(),
  mockMarkAsFailed: vi.fn(),
  mockSummaryPromptsYouTube: "YouTube prompt",
  mockSummaryPromptsPodcast: "Podcast prompt",
  mockSummaryPromptsOther: "Other prompt",
  mockDefaultPrompt: "Default prompt",
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

vi.mock("../../repositories/transcription.repository", () => ({
  TranscriptionRepository: class MockTranscriptionRepository {
    updateSummary = mockUpdateSummary;
    markAsFailed = mockMarkAsFailed;
  },
}));

vi.mock("../../config/prompts.config", () => ({
  SUMMARY_PROMPTS: {
    [BookmarkSource.YOUTUBE]: mockSummaryPromptsYouTube,
    [BookmarkSource.PODCAST]: mockSummaryPromptsPodcast,
    [BookmarkSource.REDDIT]: mockSummaryPromptsOther,
    [BookmarkSource.TWITTER]: mockSummaryPromptsOther,
    [BookmarkSource.LINKEDIN]: mockSummaryPromptsOther,
    [BookmarkSource.BLOG]: mockSummaryPromptsOther,
    [BookmarkSource.WEB]: mockSummaryPromptsOther,
    [BookmarkSource.OTHER]: mockSummaryPromptsOther,
  },
  DEFAULT_SUMMARY_PROMPT: mockDefaultPrompt,
}));

// Import after mocks
import { handleSummaryGeneration } from "../../processors/summary-generation.processor";

describe("Summary Generation Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Successful Summary Generation", () => {
    it("should generate and store summary for YouTube", async () => {
      const event = {
        bookmarkId: 1,
        transcript: "This is a YouTube video transcript about technology.",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockResolvedValue(
        "Summary: YouTube video about technology trends"
      );
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        event.transcript,
        mockSummaryPromptsYouTube
      );
      expect(mockUpdateSummary).toHaveBeenCalledWith(
        1,
        "Summary: YouTube video about technology trends"
      );
    });

    it("should generate and store summary for Podcast", async () => {
      const event = {
        bookmarkId: 2,
        transcript: "This is a podcast episode transcript discussing business.",
        source: BookmarkSource.PODCAST,
      };

      mockGenerateSummary.mockResolvedValue(
        "Summary: Podcast episode about business strategy"
      );
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        event.transcript,
        mockSummaryPromptsPodcast
      );
      expect(mockUpdateSummary).toHaveBeenCalledWith(
        2,
        "Summary: Podcast episode about business strategy"
      );
    });

    it("should generate and store summary for other sources", async () => {
      const event = {
        bookmarkId: 3,
        transcript: "This is a blog post transcript.",
        source: BookmarkSource.BLOG,
      };

      mockGenerateSummary.mockResolvedValue("Summary: Blog post content");
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        event.transcript,
        mockSummaryPromptsOther
      );
      expect(mockUpdateSummary).toHaveBeenCalledWith(3, "Summary: Blog post content");
    });
  });

  describe("Prompt Selection", () => {
    it("should use YouTube prompt for YouTube source", async () => {
      const event = {
        bookmarkId: 4,
        transcript: "YouTube transcript",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        "YouTube transcript",
        mockSummaryPromptsYouTube
      );
    });

    it("should use Podcast prompt for Podcast source", async () => {
      const event = {
        bookmarkId: 5,
        transcript: "Podcast transcript",
        source: BookmarkSource.PODCAST,
      };

      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        "Podcast transcript",
        mockSummaryPromptsPodcast
      );
    });

    const otherSources = [
      BookmarkSource.REDDIT,
      BookmarkSource.TWITTER,
      BookmarkSource.LINKEDIN,
      BookmarkSource.BLOG,
      BookmarkSource.WEB,
      BookmarkSource.OTHER,
    ];

    otherSources.forEach((source) => {
      it(`should use appropriate prompt for ${source} source`, async () => {
        const event = {
          bookmarkId: 100,
          transcript: `${source} transcript`,
          source,
        };

        mockGenerateSummary.mockResolvedValue("Summary");
        mockUpdateSummary.mockResolvedValue(undefined);

        await handleSummaryGeneration(event);

        expect(mockGenerateSummary).toHaveBeenCalledWith(
          event.transcript,
          mockSummaryPromptsOther
        );
      });
    });
  });

  describe("OpenAI Summary Generation", () => {
    it("should call OpenAI service with transcript and prompt", async () => {
      const event = {
        bookmarkId: 6,
        transcript: "Long transcript about artificial intelligence and machine learning",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockResolvedValue("AI summary generated");
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        event.transcript,
        mockSummaryPromptsYouTube
      );
      expect(mockGenerateSummary).toHaveBeenCalledTimes(1);
    });

    it("should handle OpenAI API failure", async () => {
      const event = {
        bookmarkId: 7,
        transcript: "Test transcript",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockRejectedValue(new Error("OpenAI API rate limit exceeded"));

      await handleSummaryGeneration(event);

      expect(mockUpdateSummary).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        7,
        "Summary generation failed: OpenAI API rate limit exceeded"
      );
    });

    it("should handle OpenAI timeout", async () => {
      const event = {
        bookmarkId: 8,
        transcript: "Very long transcript...",
        source: BookmarkSource.PODCAST,
      };

      mockGenerateSummary.mockRejectedValue(new Error("Request timeout"));

      await handleSummaryGeneration(event);

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        8,
        "Summary generation failed: Request timeout"
      );
    });
  });

  describe("Database Storage", () => {
    it("should store summary in database", async () => {
      const event = {
        bookmarkId: 9,
        transcript: "Transcript content",
        source: BookmarkSource.YOUTUBE,
      };

      const generatedSummary = "Generated summary content with key insights";
      mockGenerateSummary.mockResolvedValue(generatedSummary);
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockUpdateSummary).toHaveBeenCalledWith(9, generatedSummary);
      expect(mockUpdateSummary).toHaveBeenCalledTimes(1);
    });

    it("should handle database update failure", async () => {
      const event = {
        bookmarkId: 10,
        transcript: "Test transcript",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockRejectedValue(
        new Error("Database connection failed")
      );

      await handleSummaryGeneration(event);

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        10,
        "Summary generation failed: Database connection failed"
      );
    });

    it("should handle database constraint violation", async () => {
      const event = {
        bookmarkId: 11,
        transcript: "Test",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockRejectedValue(
        new Error("Unique constraint violation")
      );

      await handleSummaryGeneration(event);

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        11,
        "Summary generation failed: Unique constraint violation"
      );
    });
  });

  describe("Error Handling", () => {
    it("should mark as failed on generation error", async () => {
      const event = {
        bookmarkId: 12,
        transcript: "Error transcript",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockRejectedValue(new Error("Generation failed"));

      await handleSummaryGeneration(event);

      expect(mockUpdateSummary).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        12,
        "Summary generation failed: Generation failed"
      );
    });

    it("should mark as failed on storage error", async () => {
      const event = {
        bookmarkId: 13,
        transcript: "Storage error transcript",
        source: BookmarkSource.PODCAST,
      };

      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockRejectedValue(new Error("Storage failed"));

      await handleSummaryGeneration(event);

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        13,
        "Summary generation failed: Storage failed"
      );
    });

    it("should handle non-Error exceptions", async () => {
      const event = {
        bookmarkId: 14,
        transcript: "Exception test",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockRejectedValue("String error");

      await handleSummaryGeneration(event);

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        14,
        "Summary generation failed: String error"
      );
    });
  });

  describe("Different Transcript Lengths", () => {
    it("should handle short transcript", async () => {
      const event = {
        bookmarkId: 15,
        transcript: "Short.",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockResolvedValue("Short summary");
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith("Short.", mockSummaryPromptsYouTube);
      expect(mockUpdateSummary).toHaveBeenCalledWith(15, "Short summary");
    });

    it("should handle long transcript", async () => {
      const event = {
        bookmarkId: 16,
        transcript: "Very long transcript ".repeat(1000),
        source: BookmarkSource.PODCAST,
      };

      mockGenerateSummary.mockResolvedValue("Comprehensive summary");
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockGenerateSummary).toHaveBeenCalled();
      expect(mockUpdateSummary).toHaveBeenCalledWith(16, "Comprehensive summary");
    });

    it("should handle empty transcript", async () => {
      const event = {
        bookmarkId: 17,
        transcript: "",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockResolvedValue("No content to summarize");
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockGenerateSummary).toHaveBeenCalledWith("", mockSummaryPromptsYouTube);
    });
  });

  describe("Concurrent Processing", () => {
    it("should handle concurrent summary generation requests", async () => {
      const events = [
        {
          bookmarkId: 18,
          transcript: "YouTube transcript 1",
          source: BookmarkSource.YOUTUBE,
        },
        {
          bookmarkId: 19,
          transcript: "Podcast transcript 2",
          source: BookmarkSource.PODCAST,
        },
        {
          bookmarkId: 20,
          transcript: "Blog transcript 3",
          source: BookmarkSource.BLOG,
        },
      ];

      mockGenerateSummary
        .mockResolvedValueOnce("YouTube summary")
        .mockResolvedValueOnce("Podcast summary")
        .mockResolvedValueOnce("Blog summary");
      mockUpdateSummary.mockResolvedValue(undefined);

      await Promise.all(events.map((event) => handleSummaryGeneration(event)));

      expect(mockGenerateSummary).toHaveBeenCalledTimes(3);
      expect(mockUpdateSummary).toHaveBeenCalledTimes(3);
      expect(mockUpdateSummary).toHaveBeenCalledWith(18, "YouTube summary");
      expect(mockUpdateSummary).toHaveBeenCalledWith(19, "Podcast summary");
      expect(mockUpdateSummary).toHaveBeenCalledWith(20, "Blog summary");
    });
  });

  describe("Logging and Observability", () => {
    it("should log successful summary generation", async () => {
      const event = {
        bookmarkId: 100,
        transcript: "Logging test transcript",
        source: BookmarkSource.YOUTUBE,
      };

      mockGenerateSummary.mockResolvedValue("Generated summary");
      mockUpdateSummary.mockResolvedValue(undefined);

      await handleSummaryGeneration(event);

      expect(mockLog.info).toHaveBeenCalledWith(
        "Summary generation completed",
        expect.objectContaining({
          bookmarkId: 100,
          summaryLength: expect.any(Number),
        })
      );
    });

    it("should log errors when OpenAI fails", async () => {
      const event = {
        bookmarkId: 101,
        transcript: "Error test",
        source: BookmarkSource.YOUTUBE,
      };

      const openaiError = new Error("OpenAI API rate limit exceeded");
      mockGenerateSummary.mockRejectedValue(openaiError);

      await handleSummaryGeneration(event);

      expect(mockLog.error).toHaveBeenCalledWith(
        openaiError,
        "Summary generation failed",
        expect.objectContaining({
          bookmarkId: 101,
        })
      );
    });

    it("should log errors when database update fails", async () => {
      const event = {
        bookmarkId: 102,
        transcript: "Database error test",
        source: BookmarkSource.PODCAST,
      };

      const dbError = new Error("Database connection failed");
      mockGenerateSummary.mockResolvedValue("Summary");
      mockUpdateSummary.mockRejectedValue(dbError);

      await handleSummaryGeneration(event);

      expect(mockLog.error).toHaveBeenCalledWith(
        dbError,
        "Summary generation failed",
        expect.objectContaining({
          bookmarkId: 102,
        })
      );
    });
  });

  describe("Handler Function", () => {
    it("should export handler function", () => {
      expect(handleSummaryGeneration).toBeDefined();
      expect(typeof handleSummaryGeneration).toBe("function");
    });
  });
});
