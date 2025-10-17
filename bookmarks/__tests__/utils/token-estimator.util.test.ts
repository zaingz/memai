/**
 * Token Estimator Utility Tests (Property-Based)
 *
 * Tests for token-estimator.util.ts utility functions.
 * Uses fast-check for property-based testing to generate comprehensive test cases.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  estimateTokenCount,
  estimateTotalTokens,
  validateContextWindow,
  calculateBatchSize,
  batchSummaries,
  getTokenStats,
} from "../../utils/token-estimator.util";

describe("token-estimator.util (Property-Based)", () => {
  describe("estimateTokenCount", () => {
    it("PROPERTY: Monotonicity (longer text >= more tokens)", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.string({ minLength: 1, maxLength: 1000 }),
          (text1, text2) => {
            const tokens1 = estimateTokenCount(text1);
            const tokens2 = estimateTokenCount(text2);

            if (text1.length > text2.length) {
              return tokens1 >= tokens2;
            }
            return true;
          }
        )
      );
    });

    it("PROPERTY: Determinism (same input always produces same output)", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (text) => {
          const tokens1 = estimateTokenCount(text);
          const tokens2 = estimateTokenCount(text);
          return tokens1 === tokens2;
        })
      );
    });

    it("PROPERTY: Empty string always returns 0 tokens", () => {
      expect(estimateTokenCount("")).toBe(0);
    });

    it("PROPERTY: Token count within expected ratio range", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 1000 }), (text) => {
          const tokens = estimateTokenCount(text);
          const charCount = text.length;
          // Token ratio should be roughly 1 token per 4 characters (conservative estimate)
          const expectedTokens = Math.ceil(charCount / 4);
          return tokens === expectedTokens;
        })
      );
    });

    it("PROPERTY: Always returns non-negative integers", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (text) => {
          const tokens = estimateTokenCount(text);
          return Number.isInteger(tokens) && tokens >= 0;
        })
      );
    });
  });

  describe("estimateTotalTokens", () => {
    it("PROPERTY: Sum of individual estimates equals total", () => {
      fc.assert(
        fc.property(fc.array(fc.string({ minLength: 0, maxLength: 100 })), (texts) => {
          const total = estimateTotalTokens(texts);
          const individualSum = texts.reduce(
            (sum, text) => sum + estimateTokenCount(text),
            0
          );
          return total === individualSum;
        })
      );
    });

    it("PROPERTY: Empty array returns 0 tokens", () => {
      expect(estimateTotalTokens([])).toBe(0);
    });

    it("PROPERTY: Monotonicity (more texts or longer texts >= more tokens)", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 0, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
          (texts) => {
            const total1 = estimateTotalTokens(texts);
            const total2 = estimateTotalTokens([...texts, "extra text"]);
            return total2 >= total1;
          }
        )
      );
    });

    it("PROPERTY: Order independence (same texts in different order = same total)", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 0, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
          (texts) => {
            const total1 = estimateTotalTokens(texts);
            const total2 = estimateTotalTokens([...texts].reverse());
            return total1 === total2;
          }
        )
      );
    });
  });

  describe("validateContextWindow", () => {
    it("PROPERTY: Text fits when tokens < (maxTokens - reservedTokens)", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.integer({ min: 100, max: 10000 }),
          fc.integer({ min: 10, max: 100 }),
          (text, maxTokens, reservedTokens) => {
            const tokenCount = estimateTokenCount(text);
            const fits = validateContextWindow(text, maxTokens, reservedTokens);

            if (tokenCount <= maxTokens - reservedTokens) {
              return fits === true;
            }
            return fits === false;
          }
        )
      );
    });

    it("PROPERTY: Always returns boolean", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 1000 }),
          fc.integer({ min: 1, max: 10000 }),
          (text, maxTokens) => {
            const fits = validateContextWindow(text, maxTokens);
            return typeof fits === "boolean";
          }
        )
      );
    });

    it("PROPERTY: Uses default reserved tokens when not provided", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1000, max: 5000 }),
          (text, maxTokens) => {
            const fitsWithDefault = validateContextWindow(text, maxTokens);
            const fitsWithExplicit = validateContextWindow(text, maxTokens, 1000);
            return fitsWithDefault === fitsWithExplicit;
          }
        )
      );
    });
  });

  describe("calculateBatchSize", () => {
    it("PROPERTY: Batch size never exceeds array length", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 100, max: 10000 }),
          (summaries, maxTokens) => {
            const batchSize = calculateBatchSize(summaries, maxTokens);
            return batchSize <= summaries.length;
          }
        )
      );
    });

    it("PROPERTY: Empty array returns 0", () => {
      fc.assert(
        fc.property(fc.integer({ min: 100, max: 10000 }), (maxTokens) => {
          return calculateBatchSize([], maxTokens) === 0;
        })
      );
    });

    it("PROPERTY: Non-empty array returns at least 1", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 100, max: 10000 }),
          (summaries, maxTokens) => {
            const batchSize = calculateBatchSize(summaries, maxTokens);
            return batchSize >= 1;
          }
        )
      );
    });

    it("PROPERTY: Batch size is always a positive integer", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 })),
          fc.integer({ min: 100, max: 10000 }),
          (summaries, maxTokens) => {
            const batchSize = calculateBatchSize(summaries, maxTokens);
            return Number.isInteger(batchSize) && batchSize >= 0;
          }
        )
      );
    });
  });

  describe("batchSummaries", () => {
    it("PROPERTY: All summaries included in batches", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 100, max: 10000 }),
          (summaries, maxTokens) => {
            const batches = batchSummaries(summaries, maxTokens);
            const flattenedCount = batches.reduce((sum, batch) => sum + batch.length, 0);
            return flattenedCount === summaries.length;
          }
        )
      );
    });

    it("PROPERTY: Empty array produces empty batches", () => {
      fc.assert(
        fc.property(fc.integer({ min: 100, max: 10000 }), (maxTokens) => {
          const batches = batchSummaries([], maxTokens);
          return batches.length === 0;
        })
      );
    });

    it("PROPERTY: Each batch respects token limit (or has 1 item if oversized)", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 50, max: 1000 }),
          (summaries, maxTokens) => {
            const batches = batchSummaries(summaries, maxTokens);

            return batches.every((batch) => {
              const batchTokens = estimateTotalTokens(batch);
              // Either within limit, or single oversized item
              return batchTokens <= maxTokens || batch.length === 1;
            });
          }
        )
      );
    });

    it("PROPERTY: Order preservation (items in same order as input)", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 100, max: 10000 }),
          (summaries, maxTokens) => {
            const batches = batchSummaries(summaries, maxTokens);
            const flattened = batches.flat();
            return JSON.stringify(flattened) === JSON.stringify(summaries);
          }
        )
      );
    });
  });

  describe("getTokenStats", () => {
    it("PROPERTY: Count equals array length", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 0, maxLength: 100 })),
          (summaries) => {
            const stats = getTokenStats(summaries);
            return stats.count === summaries.length;
          }
        )
      );
    });

    it("PROPERTY: Total tokens equals sum of individual estimates", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 0, maxLength: 100 })),
          (summaries) => {
            const stats = getTokenStats(summaries);
            const expectedTotal = estimateTotalTokens(summaries);
            return stats.totalTokens === expectedTotal;
          }
        )
      );
    });

    it("PROPERTY: Min and max are within bounds", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
          (summaries) => {
            const stats = getTokenStats(summaries);
            const tokens = summaries.map(estimateTokenCount);
            const actualMin = Math.min(...tokens);
            const actualMax = Math.max(...tokens);

            return stats.minTokens === actualMin && stats.maxTokens === actualMax;
          }
        )
      );
    });

    it("PROPERTY: Average is within min and max range", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
          (summaries) => {
            const stats = getTokenStats(summaries);
            return stats.avgTokens >= stats.minTokens && stats.avgTokens <= stats.maxTokens;
          }
        )
      );
    });

    it("PROPERTY: Empty array returns all zeros", () => {
      const stats = getTokenStats([]);
      expect(stats.count).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.avgTokens).toBe(0);
      expect(stats.minTokens).toBe(0);
      expect(stats.maxTokens).toBe(0);
    });
  });
});
