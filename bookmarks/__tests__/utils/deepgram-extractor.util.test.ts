/**
 * Deepgram Extractor Utility Tests (Property-Based)
 *
 * Tests for deepgram-extractor.util.ts utility functions.
 * Uses fast-check for property-based testing of data extraction from Deepgram responses.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { extractDeepgramData } from "../../utils/deepgram-extractor.util";
import { createTestDeepgramResponse } from "../../../test/factories/bookmark.factory";
import { DeepgramResponse } from "../../types";

describe("deepgram-extractor.util (Property-Based)", () => {
  describe("extractDeepgramData", () => {
    it("PROPERTY: Null safety (missing optional fields return null, never throw)", () => {
      fc.assert(
        fc.property(
          fc.record({
            hasSentiment: fc.boolean(),
            hasSummary: fc.boolean(),
            hasAverage: fc.boolean(),
          }),
          ({ hasSentiment, hasSummary, hasAverage }) => {
            const response = createTestDeepgramResponse({
              results: {
                ...createTestDeepgramResponse().results,
                sentiments: hasSentiment
                  ? hasAverage
                    ? createTestDeepgramResponse().results.sentiments
                    : { average: null, segments: [] }
                  : null,
                summary: hasSummary ? createTestDeepgramResponse().results.summary : null,
              },
            });

            try {
              const extracted = extractDeepgramData(response);
              // Should not throw, should return null for missing fields
              return (
                extracted.transcript !== null &&
                (hasSentiment && hasAverage ? extracted.sentiment !== null : extracted.sentiment === null) &&
                (hasSummary ? extracted.deepgramSummary !== null : extracted.deepgramSummary === null)
              );
            } catch {
              return false; // Should not throw for missing optional fields
            }
          }
        )
      );
    });

    it("PROPERTY: Sentiment score range (always between -1 and 1, or null)", () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1, max: 1, noNaN: true }),
          fc.constantFrom("positive", "negative", "neutral") as fc.Arbitrary<
            "positive" | "negative" | "neutral"
          >,
          (sentimentScore, sentiment) => {
            const response = createTestDeepgramResponse({
              results: {
                ...createTestDeepgramResponse().results,
                sentiments: {
                  average: { sentiment, sentiment_score: sentimentScore },
                  segments: [],
                },
              },
            });

            const extracted = extractDeepgramData(response);

            return (
              extracted.sentimentScore === sentimentScore &&
              extracted.sentimentScore >= -1 &&
              extracted.sentimentScore <= 1
            );
          }
        )
      );
    });

    it("PROPERTY: Confidence score range (always between 0 and 1)", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          (confidence) => {
            const response = createTestDeepgramResponse({
              results: {
                ...createTestDeepgramResponse().results,
                channels: [
                  {
                    alternatives: [
                      {
                        transcript: "Test transcript",
                        confidence,
                        words: [],
                        paragraphs: undefined,
                      },
                    ],
                  },
                ],
              },
            });

            const extracted = extractDeepgramData(response);

            return extracted.confidence === confidence && extracted.confidence >= 0 && extracted.confidence <= 1;
          }
        )
      );
    });

    it("PROPERTY: Duration is always non-negative", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 10000, noNaN: true }),
          (duration) => {
            const response = createTestDeepgramResponse({
              metadata: {
                ...createTestDeepgramResponse().metadata,
                duration,
              },
            });

            const extracted = extractDeepgramData(response);

            return extracted.duration === duration && extracted.duration >= 0;
          }
        )
      );
    });

    it("PROPERTY: Determinism (same response always produces same extraction)", () => {
      const response = createTestDeepgramResponse();
      const extracted1 = extractDeepgramData(response);
      const extracted2 = extractDeepgramData(response);

      expect(extracted1).toEqual(extracted2);
    });

    it("PROPERTY: Transcript is never null for valid response (or throws)", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          (transcript) => {
            const response = createTestDeepgramResponse({
              results: {
                ...createTestDeepgramResponse().results,
                channels: [
                  {
                    alternatives: [
                      {
                        transcript,
                        confidence: 0.9,
                        words: [],
                        paragraphs: undefined,
                      },
                    ],
                  },
                ],
              },
            });

            const extracted = extractDeepgramData(response);
            return extracted.transcript === transcript;
          }
        )
      );
    });

    it("PROPERTY: Sentiment score of 0 is preserved (not treated as falsy)", () => {
      // This is the BUG FIX test case
      const response = createTestDeepgramResponse({
        results: {
          ...createTestDeepgramResponse().results,
          sentiments: {
            average: {
              sentiment: "neutral" as "positive" | "negative" | "neutral",
              sentiment_score: 0.0,
            },
            segments: [],
          },
        },
      });

      const extracted = extractDeepgramData(response);

      // After bug fix: sentimentScore should be 0, not null
      expect(extracted.sentiment).toBe("neutral");
      expect(extracted.sentimentScore).toBe(0);
    });
  });

  describe("Edge Cases (Manual)", () => {
    it("should extract all data from complete Deepgram response", () => {
      const response = createTestDeepgramResponse();
      const extracted = extractDeepgramData(response);

      expect(extracted.transcript).toBe(
        "This is a test transcript from a video about software engineering best practices."
      );
      expect(extracted.confidence).toBe(0.95);
      expect(extracted.duration).toBe(120.5);
      expect(extracted.sentiment).toBe("positive");
      expect(extracted.sentimentScore).toBe(0.85);
      expect(extracted.deepgramSummary).toBe(
        "Test Deepgram summary: Video discusses software engineering best practices."
      );
    });

    it("should handle response with null sentiment", () => {
      const response = createTestDeepgramResponse({
        results: {
          ...createTestDeepgramResponse().results,
          sentiments: null,
        },
      });

      const extracted = extractDeepgramData(response);

      expect(extracted.sentiment).toBeNull();
      expect(extracted.sentimentScore).toBeNull();
      expect(extracted.transcript).toBeDefined();
      expect(extracted.confidence).toBeGreaterThan(0);
    });

    it("should handle response with null summary", () => {
      const response = createTestDeepgramResponse({
        results: {
          ...createTestDeepgramResponse().results,
          summary: null,
        },
      });

      const extracted = extractDeepgramData(response);

      expect(extracted.deepgramSummary).toBeNull();
      expect(extracted.transcript).toBeDefined();
      expect(extracted.confidence).toBeGreaterThan(0);
    });

    it("should throw error when transcript is empty", () => {
      const response: DeepgramResponse = {
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: "",
                  confidence: 0,
                  words: [],
                  paragraphs: undefined,
                },
              ],
            },
          ],
          sentiments: null,
          intents: null,
          topics: null,
          summary: null,
        },
        metadata: {
          model_info: {
            name: "nova-3",
            version: "2025-01-15",
            arch: "nova",
          },
          request_id: "test-id",
          duration: 0,
          channels: 1,
          created: "2025-01-01T00:00:00Z",
        },
      };

      expect(() => extractDeepgramData(response)).toThrow(
        "No transcript returned from Deepgram"
      );
    });

    it("should throw error when no alternatives exist", () => {
      const response: DeepgramResponse = {
        results: {
          channels: [
            {
              alternatives: [],
            },
          ],
          sentiments: null,
          intents: null,
          topics: null,
          summary: null,
        },
        metadata: {
          model_info: {
            name: "nova-3",
            version: "2025-01-15",
            arch: "nova",
          },
          request_id: "test-id",
          duration: 0,
          channels: 1,
          created: "2025-01-01T00:00:00Z",
        },
      };

      expect(() => extractDeepgramData(response)).toThrow(
        "No transcript returned from Deepgram"
      );
    });

    it("should handle negative sentiment", () => {
      const response = createTestDeepgramResponse({
        results: {
          ...createTestDeepgramResponse().results,
          sentiments: {
            average: {
              sentiment: "negative" as "positive" | "negative" | "neutral",
              sentiment_score: -0.65,
            },
            segments: [],
          },
        },
      });

      const extracted = extractDeepgramData(response);

      expect(extracted.sentiment).toBe("negative");
      expect(extracted.sentimentScore).toBe(-0.65);
    });

    it("should handle low confidence transcripts", () => {
      const response = createTestDeepgramResponse({
        results: {
          ...createTestDeepgramResponse().results,
          channels: [
            {
              alternatives: [
                {
                  transcript: "Test transcript",
                  confidence: 0.45,
                  words: [],
                  paragraphs: undefined,
                },
              ],
            },
          ],
        },
      });

      const extracted = extractDeepgramData(response);

      expect(extracted.confidence).toBe(0.45);
      expect(extracted.transcript).toBe("Test transcript");
    });
  });
});
