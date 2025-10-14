/**
 * Token Estimator Utility Tests
 *
 * Tests for token-estimator.util.ts utility functions.
 * Tests token counting, batching, and context window validation.
 */

import { describe, it, expect } from "vitest";
import {
  estimateTokenCount,
  estimateTotalTokens,
  validateContextWindow,
  calculateBatchSize,
  batchSummaries,
  getTokenStats,
} from "../../utils/token-estimator.util";

describe("token-estimator.util", () => {
  describe("estimateTokenCount", () => {
    it("should estimate tokens using character approximation", () => {
      const text = "This is a test sentence with approximately twenty words in it for testing purposes.";
      const tokens = estimateTokenCount(text);

      // ~84 chars / 4 = ~21 tokens
      expect(tokens).toBeGreaterThan(15);
      expect(tokens).toBeLessThan(25);
    });

    it("should return 0 for empty string", () => {
      const tokens = estimateTokenCount("");

      expect(tokens).toBe(0);
    });

    it("should handle single character", () => {
      const tokens = estimateTokenCount("a");

      expect(tokens).toBe(1); // Math.ceil(1/4) = 1
    });

    it("should handle long text", () => {
      const text = "a".repeat(1000); // 1000 characters
      const tokens = estimateTokenCount(text);

      expect(tokens).toBe(250); // 1000 / 4 = 250
    });

    it("should round up fractional tokens", () => {
      const text = "abc"; // 3 characters
      const tokens = estimateTokenCount(text);

      expect(tokens).toBe(1); // Math.ceil(3/4) = 1
    });
  });

  describe("estimateTotalTokens", () => {
    it("should sum tokens for multiple texts", () => {
      const texts = [
        "Four char",  // 9 chars = 3 tokens
        "Eight chars", // 11 chars = 3 tokens
        "Sixteen characters!!!", // 21 chars = 6 tokens
      ];

      const total = estimateTotalTokens(texts);

      expect(total).toBe(12); // 3 + 3 + 6 = 12
    });

    it("should return 0 for empty array", () => {
      const total = estimateTotalTokens([]);

      expect(total).toBe(0);
    });

    it("should handle array with empty strings", () => {
      const texts = ["", "", ""];
      const total = estimateTotalTokens(texts);

      expect(total).toBe(0);
    });

    it("should handle mixed empty and non-empty strings", () => {
      const texts = ["test", "", "data"];
      const total = estimateTotalTokens(texts);

      // "test" = 4 chars = 1 token, "" = 0 tokens, "data" = 4 chars = 1 token
      expect(total).toBe(2);
      expect(total).toBeGreaterThan(1);
    });
  });

  describe("validateContextWindow", () => {
    it("should return true when text fits within limits", () => {
      const text = "a".repeat(100); // 100 chars = 25 tokens
      const maxTokens = 2000;
      const reservedTokens = 500;

      const fits = validateContextWindow(text, maxTokens, reservedTokens);

      // 25 tokens < (2000 - 500) = 1500
      expect(fits).toBe(true);
    });

    it("should return false when text exceeds limits", () => {
      const text = "a".repeat(10000); // 10000 chars = 2500 tokens
      const maxTokens = 2000;
      const reservedTokens = 500;

      const fits = validateContextWindow(text, maxTokens, reservedTokens);

      // 2500 tokens > (2000 - 500) = 1500
      expect(fits).toBe(false);
    });

    it("should use default reserved tokens when not provided", () => {
      const text = "a".repeat(3600); // 3600 chars = 900 tokens
      const maxTokens = 2000;
      // Default reserved tokens = 1000

      const fits = validateContextWindow(text, maxTokens);

      // 900 tokens < (2000 - 1000) = 1000
      expect(fits).toBe(true);
    });

    it("should handle exact boundary case", () => {
      const text = "a".repeat(4000); // 4000 chars = 1000 tokens
      const maxTokens = 2000;
      const reservedTokens = 1000;

      const fits = validateContextWindow(text, maxTokens, reservedTokens);

      // 1000 tokens <= (2000 - 1000) = 1000
      expect(fits).toBe(true);
    });
  });

  describe("calculateBatchSize", () => {
    it("should calculate optimal batch size", () => {
      const summaries = [
        "a".repeat(100), // 25 tokens each
        "a".repeat(100),
        "a".repeat(100),
        "a".repeat(100),
      ];
      const maxTokensPerBatch = 1000;
      const overheadTokens = 100;

      const batchSize = calculateBatchSize(summaries, maxTokensPerBatch, overheadTokens);

      // Available tokens = 1000 - 100 = 900
      // Avg tokens per summary = (4 * 25) / 4 = 25
      // Optimal batch size = 900 / 25 = 36
      // But can't exceed array length = 4
      expect(batchSize).toBe(4);
    });

    it("should return 0 for empty array", () => {
      const batchSize = calculateBatchSize([], 1000, 100);

      expect(batchSize).toBe(0);
    });

    it("should return at least 1 for non-empty array", () => {
      const summaries = ["a".repeat(10000)]; // Very large summary
      const maxTokensPerBatch = 100;

      const batchSize = calculateBatchSize(summaries, maxTokensPerBatch);

      expect(batchSize).toBe(1); // Always at least 1
    });

    it("should use default overhead tokens when not provided", () => {
      const summaries = [
        "a".repeat(200), // 50 tokens each
        "a".repeat(200),
      ];
      const maxTokensPerBatch = 2000;
      // Default overhead = 500

      const batchSize = calculateBatchSize(summaries, maxTokensPerBatch);

      // Available = 2000 - 500 = 1500
      // Avg per summary = 50
      // Optimal = 1500 / 50 = 30
      // Limited by array length = 2
      expect(batchSize).toBe(2);
    });
  });

  describe("batchSummaries", () => {
    it("should split summaries into batches by token limit", () => {
      const summaries = [
        "a".repeat(400),  // 100 tokens
        "a".repeat(400),  // 100 tokens
        "a".repeat(400),  // 100 tokens
        "a".repeat(400),  // 100 tokens
      ];
      const maxTokensPerBatch = 250;

      const batches = batchSummaries(summaries, maxTokensPerBatch);

      // Each summary = 100 tokens
      // Batch 1: summary 1 + summary 2 = 200 tokens (fits)
      // Batch 2: summary 3 + summary 4 = 200 tokens (fits)
      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(2);
      expect(batches[1]).toHaveLength(2);
    });

    it("should create single batch when all fit", () => {
      const summaries = [
        "a".repeat(100), // 25 tokens
        "a".repeat(100), // 25 tokens
        "a".repeat(100), // 25 tokens
      ];
      const maxTokensPerBatch = 1000;

      const batches = batchSummaries(summaries, maxTokensPerBatch);

      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(3);
    });

    it("should handle empty array", () => {
      const batches = batchSummaries([], 1000);

      expect(batches).toEqual([]);
    });

    it("should create one batch per summary if each exceeds limit", () => {
      const summaries = [
        "a".repeat(4000), // 1000 tokens
        "a".repeat(4000), // 1000 tokens
        "a".repeat(4000), // 1000 tokens
      ];
      const maxTokensPerBatch = 500; // Each summary exceeds this

      const batches = batchSummaries(summaries, maxTokensPerBatch);

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(1);
      expect(batches[1]).toHaveLength(1);
      expect(batches[2]).toHaveLength(1);
    });

    it("should handle mixed summary sizes", () => {
      const summaries = [
        "a".repeat(200),  // 50 tokens
        "a".repeat(800),  // 200 tokens
        "a".repeat(200),  // 50 tokens
        "a".repeat(200),  // 50 tokens
      ];
      const maxTokensPerBatch = 300;

      const batches = batchSummaries(summaries, maxTokensPerBatch);

      // Algorithm adds to current batch until exceeding limit
      // Batch 1: sum1 (50) + sum2 (200) + sum3 (50) = 300 tokens (exactly at limit)
      // Batch 2: sum4 (50) = 50 tokens
      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(3);
      expect(batches[1]).toHaveLength(1);
    });
  });

  describe("getTokenStats", () => {
    it("should return accurate statistics for summaries", () => {
      const summaries = [
        "a".repeat(100),  // 25 tokens
        "a".repeat(200),  // 50 tokens
        "a".repeat(400),  // 100 tokens
        "a".repeat(600),  // 150 tokens
      ];

      const stats = getTokenStats(summaries);

      expect(stats.count).toBe(4);
      expect(stats.totalTokens).toBe(325); // 25 + 50 + 100 + 150
      expect(stats.avgTokens).toBe(81); // Math.round(325 / 4)
      expect(stats.minTokens).toBe(25);
      expect(stats.maxTokens).toBe(150);
    });

    it("should return zeros for empty array", () => {
      const stats = getTokenStats([]);

      expect(stats.count).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.avgTokens).toBe(0);
      expect(stats.minTokens).toBe(0);
      expect(stats.maxTokens).toBe(0);
    });

    it("should handle single summary", () => {
      const summaries = ["a".repeat(400)]; // 100 tokens

      const stats = getTokenStats(summaries);

      expect(stats.count).toBe(1);
      expect(stats.totalTokens).toBe(100);
      expect(stats.avgTokens).toBe(100);
      expect(stats.minTokens).toBe(100);
      expect(stats.maxTokens).toBe(100);
    });

    it("should handle all same size summaries", () => {
      const summaries = [
        "a".repeat(200), // 50 tokens
        "a".repeat(200), // 50 tokens
        "a".repeat(200), // 50 tokens
      ];

      const stats = getTokenStats(summaries);

      expect(stats.count).toBe(3);
      expect(stats.totalTokens).toBe(150);
      expect(stats.avgTokens).toBe(50);
      expect(stats.minTokens).toBe(50);
      expect(stats.maxTokens).toBe(50);
    });
  });
});
