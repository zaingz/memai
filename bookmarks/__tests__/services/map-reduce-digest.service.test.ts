/**
 * MapReduceDigestService Tests
 *
 * Unit tests for the map-reduce digest service that:
 * - Handles various input sizes (1 to 1000+ transcriptions)
 * - Performs intelligent batching based on token limits
 * - Executes map phase with parallel processing
 * - Combines intermediate summaries in reduce phase
 * - Handles LangChain errors gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookmarkSource } from "../../types/domain.types";
import type { DigestContentItem } from "../../types/web-content.types";

// Hoist mock functions for use in module mocks
const {
  mockLLMInvoke,
  mockBatchSummaries,
  mockEstimateTokenCount,
  mockLog,
} = vi.hoisted(() => ({
  mockLLMInvoke: vi.fn(),
  mockBatchSummaries: vi.fn(),
  mockEstimateTokenCount: vi.fn(),
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

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class MockChatOpenAI {
    invoke = mockLLMInvoke;
  },
}));

vi.mock("langchain/chains", () => ({
  loadSummarizationChain: vi.fn(),
}));

vi.mock("@langchain/textsplitters", () => ({
  RecursiveCharacterTextSplitter: vi.fn(),
}));

vi.mock("@langchain/core/documents", () => ({
  Document: class MockDocument {
    pageContent: string;
    metadata: any;
    constructor(config: { pageContent: string; metadata?: any }) {
      this.pageContent = config.pageContent;
      this.metadata = config.metadata || {};
    }
  },
}));

vi.mock("../../utils/token-estimator.util", () => ({
  batchSummaries: mockBatchSummaries,
  estimateTokenCount: mockEstimateTokenCount,
}));

vi.mock("../../config/prompts.config", () => ({
  MAP_REDUCE_MAP_PROMPT: "Map prompt: {batch_summaries}",
  MAP_REDUCE_REDUCE_PROMPT: "Reduce prompt: {intermediate_summaries}",
  formatSourceName: vi.fn((source) => source),
}));

vi.mock("../../config/daily-digest.config", () => ({
  DAILY_DIGEST_CONFIG: {
    openaiModel: "gpt-4.1-mini",
    temperature: 0.7,
    maxOutputTokens: 2000,
    maxTokensPerBatch: 4000,
  },
}));

// Import after mocks
import { MapReduceDigestService } from "../../services/map-reduce-digest.service";

describe("MapReduceDigestService", () => {
  let service: MapReduceDigestService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MapReduceDigestService("mock-openai-api-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create mock content item (audio or article)
  const createMockContentItem = (
    id: number,
    summary: string,
    source: BookmarkSource = BookmarkSource.YOUTUBE,
    contentType: 'audio' | 'article' = 'audio'
  ): DigestContentItem => ({
    bookmark_id: id,
    content_type: contentType,
    summary,
    source,
    duration: contentType === 'audio' ? 120 : undefined,
    word_count: contentType === 'article' ? 500 : undefined,
    reading_minutes: contentType === 'article' ? 3 : undefined,
    created_at: new Date(),
  });

  describe("Single Content Item", () => {
    it("should handle single content item without batching", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
      ];

      mockEstimateTokenCount.mockReturnValue(100);
      mockBatchSummaries.mockReturnValue([["Summary 1"]]);
      mockLLMInvoke.mockResolvedValue({
        content: "Map result: Analyzed summary 1",
      });

      const result = await service.generateDigest(contentItems);

      expect(mockBatchSummaries).toHaveBeenCalledWith(["Summary 1"], 4000);
      expect(mockLLMInvoke).toHaveBeenCalledTimes(1);
      expect(result).toBe("Map result: Analyzed summary 1"); // Single intermediate, used directly
    });

    it("should use summary if available, fallback to deepgram_summary", async () => {
      const contentItems = [
        {
          ...createMockContentItem(1, null as any, BookmarkSource.PODCAST),
          deepgram_summary: "Deepgram summary",
        },
      ];

      mockEstimateTokenCount.mockReturnValue(100);
      mockBatchSummaries.mockReturnValue([["Deepgram summary"]]);
mockLLMInvoke.mockResolvedValue({ content: "Analyzed" });

      const result = await service.generateDigest(contentItems);

      expect(mockBatchSummaries).toHaveBeenCalledWith(["Deepgram summary"], 4000);
      expect(result).toBe("Analyzed");
    });

    it("should handle missing summary with fallback text", async () => {
      const contentItems = [
        {
          ...createMockContentItem(1, null as any, BookmarkSource.BLOG),
          deepgram_summary: null,
        },
      ];

      mockEstimateTokenCount.mockReturnValue(50);
      mockBatchSummaries.mockReturnValue([["No summary available"]]);
mockLLMInvoke.mockResolvedValue({ content: "Processed" });

      const result = await service.generateDigest(contentItems);

      expect(mockBatchSummaries).toHaveBeenCalledWith(["No summary available"], 4000);
    });
  });

  describe("Multiple Transcriptions - Small Batch", () => {
    it("should handle multiple transcriptions in single batch", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
        createMockContentItem(2, "Summary 2", BookmarkSource.PODCAST),
        createMockContentItem(3, "Summary 3", BookmarkSource.BLOG),
      ];

      mockEstimateTokenCount.mockReturnValue(200);
      mockBatchSummaries.mockReturnValue([["Summary 1", "Summary 2", "Summary 3"]]);
mockLLMInvoke.mockResolvedValue({
        content: "Analyzed 3 summaries",
      });

      const result = await service.generateDigest(contentItems);

      expect(mockBatchSummaries).toHaveBeenCalledWith(
        ["Summary 1", "Summary 2", "Summary 3"],
        4000
      );
      expect(mockLLMInvoke).toHaveBeenCalledTimes(1);
      expect(result).toBe("Analyzed 3 summaries");
    });
  });

  describe("Multiple Transcriptions - Multiple Batches", () => {
    it("should batch and process multiple batches in map phase", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
        createMockContentItem(2, "Summary 2", BookmarkSource.PODCAST),
        createMockContentItem(3, "Summary 3", BookmarkSource.BLOG),
        createMockContentItem(4, "Summary 4", BookmarkSource.YOUTUBE),
      ];

      mockEstimateTokenCount.mockReturnValue(300);
      // Split into 2 batches
      mockBatchSummaries.mockReturnValue([
        ["Summary 1", "Summary 2"],
        ["Summary 3", "Summary 4"],
      ]);
      vi.fn()
        .mockReturnValueOnce("Formatted batch 1")
        .mockReturnValueOnce("Formatted batch 2");

      // Map phase returns 2 intermediate summaries
      mockLLMInvoke
        .mockResolvedValueOnce({ content: "Intermediate 1" })
        .mockResolvedValueOnce({ content: "Intermediate 2" })
        // Reduce phase combines them
        .mockResolvedValueOnce({ content: "Final digest combining both" });

      const result = await service.generateDigest(contentItems);

      expect(mockBatchSummaries).toHaveBeenCalled();
      expect(mockLLMInvoke).toHaveBeenCalledTimes(3); // 2 map + 1 reduce
      expect(result).toBe("Final digest combining both");
    });

    it("should process map batches in parallel", async () => {
      const contentItems = Array.from({ length: 10 }, (_, i) =>
        createMockContentItem(i + 1, `Summary ${i + 1}`, BookmarkSource.YOUTUBE)
      );

      mockEstimateTokenCount.mockReturnValue(500);
      // Create 3 batches
      mockBatchSummaries.mockReturnValue([
        ["Summary 1", "Summary 2", "Summary 3"],
        ["Summary 4", "Summary 5", "Summary 6"],
        ["Summary 7", "Summary 8", "Summary 9", "Summary 10"],
      ]);
      vi.fn().mockReturnValue("Formatted");

      let mapCallCount = 0;
      mockLLMInvoke.mockImplementation(() => {
        mapCallCount++;
        if (mapCallCount <= 3) {
          return Promise.resolve({ content: `Map result ${mapCallCount}` });
        } else {
          return Promise.resolve({ content: "Final reduce result" });
        }
      });

      const result = await service.generateDigest(contentItems);

      expect(mockLLMInvoke).toHaveBeenCalledTimes(4); // 3 map + 1 reduce
      expect(result).toBe("Final reduce result");
    });
  });

  describe("Reduce Phase", () => {
    it("should combine multiple intermediate summaries", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
        createMockContentItem(2, "Summary 2", BookmarkSource.PODCAST),
      ];

      mockEstimateTokenCount.mockReturnValue(200);
      mockBatchSummaries.mockReturnValue([["Summary 1"], ["Summary 2"]]);
      vi.fn().mockReturnValue("Formatted");

      mockLLMInvoke
        .mockResolvedValueOnce({ content: "Intermediate 1" })
        .mockResolvedValueOnce({ content: "Intermediate 2" })
        .mockResolvedValueOnce({ content: "Final combined digest" });

      const result = await service.generateDigest(contentItems);

      // Check that reduce prompt was called with both intermediates
      const reduceCall = mockLLMInvoke.mock.calls[2][0];
      expect(reduceCall).toContain("Intermediate 1");
      expect(reduceCall).toContain("Intermediate 2");
      expect(result).toBe("Final combined digest");
    });

    it("should skip reduce phase with single intermediate", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
      ];

      mockEstimateTokenCount.mockReturnValue(100);
      mockBatchSummaries.mockReturnValue([["Summary 1"]]);
      vi.fn().mockReturnValue("Formatted");
      mockLLMInvoke.mockResolvedValue({ content: "Single intermediate" });

      const result = await service.generateDigest(contentItems);

      expect(mockLLMInvoke).toHaveBeenCalledTimes(1); // Only map, no reduce
      expect(result).toBe("Single intermediate");
    });
  });

  describe("Token Estimation and Batching", () => {
    it("should estimate tokens for each summary", async () => {
      const contentItems = [
        createMockContentItem(1, "Short", BookmarkSource.YOUTUBE),
        createMockContentItem(2, "Medium length summary", BookmarkSource.PODCAST),
        createMockContentItem(3, "Very long summary text", BookmarkSource.BLOG),
      ];

      mockEstimateTokenCount.mockReturnValueOnce(10).mockReturnValueOnce(50).mockReturnValueOnce(100);
      mockBatchSummaries.mockReturnValue([["Short", "Medium length summary", "Very long summary text"]]);
      vi.fn().mockReturnValue("Formatted");
      mockLLMInvoke.mockResolvedValue({ content: "Result" });

      await service.generateDigest(contentItems);

      expect(mockEstimateTokenCount).toHaveBeenCalledTimes(3);
      expect(mockEstimateTokenCount).toHaveBeenCalledWith("Short");
      expect(mockEstimateTokenCount).toHaveBeenCalledWith("Medium length summary");
      expect(mockEstimateTokenCount).toHaveBeenCalledWith("Very long summary text");
    });

    it("should batch summaries based on token limits", async () => {
      const contentItems = Array.from({ length: 20 }, (_, i) =>
        createMockContentItem(i + 1, `Summary ${i + 1}`, BookmarkSource.YOUTUBE)
      );

      mockEstimateTokenCount.mockReturnValue(1000);
      mockBatchSummaries.mockReturnValue([
        Array.from({ length: 5 }, (_, i) => `Summary ${i + 1}`),
        Array.from({ length: 5 }, (_, i) => `Summary ${i + 6}`),
        Array.from({ length: 5 }, (_, i) => `Summary ${i + 11}`),
        Array.from({ length: 5 }, (_, i) => `Summary ${i + 16}`),
      ]);
      vi.fn().mockReturnValue("Formatted");
      mockLLMInvoke.mockResolvedValue({ content: "Result" });

      await service.generateDigest(contentItems);

      expect(mockBatchSummaries).toHaveBeenCalledWith(
        expect.any(Array),
        4000 // maxTokensPerBatch from config
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle LangChain LLM invocation failure", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
      ];

      mockEstimateTokenCount.mockReturnValue(100);
      mockBatchSummaries.mockReturnValue([["Summary 1"]]);
      vi.fn().mockReturnValue("Formatted");
      mockLLMInvoke.mockRejectedValue(new Error("OpenAI API error"));

      await expect(service.generateDigest(contentItems)).rejects.toThrow(
        "Map-reduce digest generation failed: OpenAI API error"
      );
    });

    it("should handle map phase failure", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
        createMockContentItem(2, "Summary 2", BookmarkSource.PODCAST),
      ];

      mockEstimateTokenCount.mockReturnValue(200);
      mockBatchSummaries.mockReturnValue([["Summary 1"], ["Summary 2"]]);
      vi.fn().mockReturnValue("Formatted");
      mockLLMInvoke
        .mockResolvedValueOnce({ content: "Success" })
        .mockRejectedValueOnce(new Error("Map batch failed"));

      await expect(service.generateDigest(contentItems)).rejects.toThrow(
        "Map-reduce digest generation failed"
      );
    });

    it("should handle reduce phase failure", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
        createMockContentItem(2, "Summary 2", BookmarkSource.PODCAST),
      ];

      mockEstimateTokenCount.mockReturnValue(200);
      mockBatchSummaries.mockReturnValue([["Summary 1"], ["Summary 2"]]);
      vi.fn().mockReturnValue("Formatted");
      mockLLMInvoke
        .mockResolvedValueOnce({ content: "Intermediate 1" })
        .mockResolvedValueOnce({ content: "Intermediate 2" })
        .mockRejectedValueOnce(new Error("Reduce failed"));

      await expect(service.generateDigest(contentItems)).rejects.toThrow(
        "Map-reduce digest generation failed: Reduce failed"
      );
    });

    it("should handle non-Error exceptions", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
      ];

      mockEstimateTokenCount.mockReturnValue(100);
      mockBatchSummaries.mockReturnValue([["Summary 1"]]);
      vi.fn().mockReturnValue("Formatted");
      mockLLMInvoke.mockRejectedValue("String error");

      await expect(service.generateDigest(contentItems)).rejects.toThrow(
        "Map-reduce digest generation failed: String error"
      );
    });
  });

  describe("Different Sources", () => {
    it("should handle mixed sources in digest", async () => {
      const contentItems = [
        createMockContentItem(1, "YouTube summary", BookmarkSource.YOUTUBE),
        createMockContentItem(2, "Podcast summary", BookmarkSource.PODCAST),
        createMockContentItem(3, "Blog summary", BookmarkSource.BLOG),
        createMockContentItem(4, "Reddit summary", BookmarkSource.REDDIT),
      ];

      mockEstimateTokenCount.mockReturnValue(200);
      mockBatchSummaries.mockReturnValue([
        ["YouTube summary", "Podcast summary", "Blog summary", "Reddit summary"],
      ]);
      vi.fn().mockReturnValue("Mixed sources formatted");
      mockLLMInvoke.mockResolvedValue({ content: "Multi-source digest" });

      const result = await service.generateDigest(contentItems);

      expect(result).toBe("Multi-source digest");
      expect(mockFormatSummariesWithMetadata).toHaveBeenCalled();
    });
  });

  describe("Large Scale Processing", () => {
    it("should handle 100+ transcriptions efficiently", async () => {
      const contentItems = Array.from({ length: 100 }, (_, i) =>
        createMockContentItem(i + 1, `Summary ${i + 1}`, BookmarkSource.YOUTUBE)
      );

      mockEstimateTokenCount.mockReturnValue(300);
      // Simulate 10 batches of 10 summaries each
      const batches = Array.from({ length: 10 }, (_, batchIdx) =>
        Array.from({ length: 10 }, (_, i) => `Summary ${batchIdx * 10 + i + 1}`)
      );
      mockBatchSummaries.mockReturnValue(batches);
      vi.fn().mockReturnValue("Formatted");

      let callCount = 0;
      mockLLMInvoke.mockImplementation(() => {
        callCount++;
        if (callCount <= 10) {
          return Promise.resolve({ content: `Map result ${callCount}` });
        } else {
          return Promise.resolve({ content: "Final digest" });
        }
      });

      const result = await service.generateDigest(contentItems);

      expect(mockBatchSummaries).toHaveBeenCalled();
      expect(mockLLMInvoke).toHaveBeenCalledTimes(11); // 10 map + 1 reduce
      expect(result).toBe("Final digest");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty transcriptions array gracefully", async () => {
      const transcriptions: DigestContentItem[] = [];

      mockEstimateTokenCount.mockReturnValue(0);
      mockBatchSummaries.mockReturnValue([]);

      // Should fail during map phase with empty batches
      await expect(service.generateDigest(contentItems)).rejects.toThrow();
    });

    it("should handle transcriptions with very long summaries", async () => {
      const longSummary = "Very long summary ".repeat(1000);
      const contentItems = [
        createMockContentItem(1, longSummary, BookmarkSource.YOUTUBE),
      ];

      mockEstimateTokenCount.mockReturnValue(10000);
      mockBatchSummaries.mockReturnValue([[longSummary]]);
      vi.fn().mockReturnValue("Long formatted");
      mockLLMInvoke.mockResolvedValue({ content: "Processed long summary" });

      const result = await service.generateDigest(contentItems);

      expect(result).toBe("Processed long summary");
    });
  });

  describe("Logging and Observability", () => {
    it("should log successful digest generation", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
        createMockContentItem(2, "Summary 2", BookmarkSource.PODCAST),
      ];

      mockEstimateTokenCount.mockReturnValue(200);
      mockBatchSummaries.mockReturnValue([["Summary 1"], ["Summary 2"]]);
      vi.fn().mockReturnValue("Formatted");
      mockLLMInvoke
        .mockResolvedValueOnce({ content: "Intermediate 1" })
        .mockResolvedValueOnce({ content: "Intermediate 2" })
        .mockResolvedValueOnce({ content: "Final digest" });

      await service.generateDigest(contentItems);

      expect(mockLog.info).toHaveBeenCalledWith(
        "Map-reduce digest generation completed",
        expect.objectContaining({
          finalDigestLength: expect.any(Number),
        })
      );
    });

    it("should log errors when LLM invocation fails", async () => {
      const contentItems = [
        createMockContentItem(1, "Summary 1", BookmarkSource.YOUTUBE),
      ];

      const llmError = new Error("OpenAI API error");
      mockEstimateTokenCount.mockReturnValue(100);
      mockBatchSummaries.mockReturnValue([["Summary 1"]]);
      vi.fn().mockReturnValue("Formatted");
      mockLLMInvoke.mockRejectedValue(llmError);

      await expect(service.generateDigest(contentItems)).rejects.toThrow();

      expect(mockLog.error).toHaveBeenCalledWith(
        llmError,
        "Map-reduce digest generation failed"
      );
    });

    it("should log map phase progress", async () => {
      const contentItems = Array.from({ length: 10 }, (_, i) =>
        createMockContentItem(i + 1, `Summary ${i + 1}`, BookmarkSource.YOUTUBE)
      );

      mockEstimateTokenCount.mockReturnValue(500);
      mockBatchSummaries.mockReturnValue([
        ["Summary 1", "Summary 2", "Summary 3"],
        ["Summary 4", "Summary 5", "Summary 6"],
        ["Summary 7", "Summary 8", "Summary 9", "Summary 10"],
      ]);
      vi.fn().mockReturnValue("Formatted");
      mockLLMInvoke.mockResolvedValue({ content: "Result" });

      await service.generateDigest(contentItems);

      expect(mockLog.info).toHaveBeenCalledWith(
        "Map phase completed",
        expect.objectContaining({
          intermediateCount: 3,
        })
      );
    });
  });

  describe("Service Initialization", () => {
    it("should initialize with API key", () => {
      const newService = new MapReduceDigestService("test-api-key");
      expect(newService).toBeInstanceOf(MapReduceDigestService);
    });
  });
});
