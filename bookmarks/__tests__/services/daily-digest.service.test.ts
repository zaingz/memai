/**
 * Daily Digest Service Tests
 *
 * Unit tests for DailyDigestService with mocked repository and external services.
 * Tests digest orchestration, date range calculation, metadata computation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DigestStatus,
  BookmarkSource,
  TranscriptionSummary,
  DailyDigest,
  DigestContentItem,
} from "../../types";

// Hoist mock functions so they're available in mock factories
// The mock function must be created in vi.hoisted() so it's available before module loading
const { mockGenerateDigest } = vi.hoisted(() => {
  const mockGenDigest = vi.fn();
  return { mockGenerateDigest: mockGenDigest };
});

// Mock encore.dev/config for secrets
// secret() returns a function that when called returns the API key
vi.mock("encore.dev/config", () => ({
  secret: vi.fn(() => () => "test-api-key"),
}));

// Mock MapReduceDigestService to return an instance with mockGenerateDigest
// IMPORTANT: The mock must return the SAME function reference each time
vi.mock("../../services/map-reduce-digest.service", () => {
  return {
    MapReduceDigestService: class MockMapReduceDigestService {
      generateDigest = mockGenerateDigest;
    },
  };
});

// Import service and repository after mocks
import { DailyDigestService } from "../../services/daily-digest.service";
import { DailyDigestRepository } from "../../repositories/daily-digest.repository";

describe("DailyDigestService", () => {
  let service: DailyDigestService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock repository
    mockRepo = {
      findByDate: vi.fn(),
      create: vi.fn(),
      markAsProcessing: vi.fn(),
      markAsCompleted: vi.fn(),
      getCompletedTranscriptionsInRange: vi.fn(),
      getCompletedWebContentInRange: vi.fn(),
      list: vi.fn(),
    };

    service = new DailyDigestService(mockRepo as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const getLastDigestCall = () => {
    const calls = mockGenerateDigest.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    return calls[calls.length - 1] as [any, any];
  };

  describe("generateDailyDigest", () => {
    const testDate = new Date("2025-01-15T12:00:00Z");
    const userId = "user-123";
    const digestDateLabel = testDate.toISOString().split("T")[0];

    const createMockTranscription = (
      id: number,
      source: BookmarkSource,
      duration: number = 300,
      summary: string = "Test summary"
    ): TranscriptionSummary => ({
      bookmark_id: id,
      transcript: `Full transcript for ${source} ${id}`,
      summary,
      deepgram_summary: `Deepgram summary for ${source} ${id}`,
      source,
      duration,
      sentiment: "neutral" as const,
      created_at: new Date(),
    });

    const createMockWebContent = (
      id: number,
      source: BookmarkSource,
      wordCount: number = 1000,
      summary: string = "Test web summary"
    ): DigestContentItem => ({
      bookmark_id: id,
      content_type: 'article' as const,
      summary,
      source,
      word_count: wordCount,
      reading_minutes: Math.ceil(wordCount / 200),
      created_at: new Date(),
    });

    const createMockDigest = (
      overrides?: Partial<DailyDigest>
    ): DailyDigest => ({
      id: 1,
      digest_date: testDate,
      user_id: null,
      status: DigestStatus.COMPLETED,
      error_message: null,
      bookmark_count: 3,
      sources_breakdown: { youtube: 2, podcast: 1 },
      date_range_start: new Date("2025-01-15T00:00:00Z"),
      date_range_end: new Date("2025-01-15T23:59:59.999Z"),
      digest_content: "Test digest content",
      total_duration: 900,
      processing_metadata: {
        modelUsed: "gpt-4.1",
        summarizationStrategy: "map-reduce",
        processingDurationMs: 1000,
      },
      processing_started_at: null,
      processing_completed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    });

    it("should return existing completed digest without regenerating", async () => {
      const existingDigest = createMockDigest();

      mockRepo.findByDate.mockResolvedValue(existingDigest);

      const result = await service.generateDailyDigest({
        date: testDate,
        userId,
        forceRegenerate: false,
      });

      expect(result).toEqual(existingDigest);
      expect(mockRepo.findByDate).toHaveBeenCalledWith(testDate, userId);
      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockGenerateDigest).not.toHaveBeenCalled();
    });

    it("should return existing processing digest without regenerating", async () => {
      const processingDigest = createMockDigest({ status: DigestStatus.PROCESSING });

      mockRepo.findByDate.mockResolvedValue(processingDigest);

      const result = await service.generateDailyDigest({
        date: testDate,
        userId,
        forceRegenerate: false,
      });

      expect(result).toEqual(processingDigest);
      expect(mockRepo.markAsProcessing).not.toHaveBeenCalled();
    });

    it("should regenerate failed digest", async () => {
      const failedDigest = createMockDigest({ status: DigestStatus.FAILED });
      const transcriptions = [
        createMockTranscription(1, BookmarkSource.YOUTUBE),
        createMockTranscription(2, BookmarkSource.PODCAST),
      ];

      mockRepo.findByDate
        .mockResolvedValueOnce(failedDigest)  // First call - existing digest
        .mockResolvedValueOnce({              // Second call - after completion
          ...failedDigest,
          status: DigestStatus.COMPLETED,
          digestContent: "Generated digest",
        });

      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue(transcriptions);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.markAsProcessing.mockResolvedValue(undefined);
      mockRepo.markAsCompleted.mockResolvedValue(undefined);
      mockGenerateDigest.mockResolvedValue("Generated digest");

      const result = await service.generateDailyDigest({
        date: testDate,
        userId,
        forceRegenerate: false,
      });

      expect(mockRepo.markAsProcessing).toHaveBeenCalledWith(failedDigest.id);
      // Verify generateDigest received unified DigestContentItem format (audio items)
      const [digestItems, digestContext] = getLastDigestCall();
      expect(digestItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bookmark_id: 1,
            content_type: 'audio',
            summary: expect.any(String),
            source: BookmarkSource.YOUTUBE,
            duration: 300,
          }),
          expect.objectContaining({
            bookmark_id: 2,
            content_type: 'audio',
            summary: expect.any(String),
            source: BookmarkSource.PODCAST,
            duration: 300,
          }),
        ])
      );
      expect(digestContext).toEqual(
        expect.objectContaining({
          digestDate: digestDateLabel,
          totalItems: 2,
          audioCount: 2,
          articleCount: 0,
        })
      );
      expect(mockRepo.markAsCompleted).toHaveBeenCalledWith(
        failedDigest.id,
        "Generated digest",
        600, // Total duration
        expect.objectContaining({
          modelUsed: "gpt-4.1",
          summarizationStrategy: "map-reduce",
        })
      );
      expect(result.status).toBe(DigestStatus.COMPLETED);
    });

    it("should force regenerate existing completed digest", async () => {
      const existingDigest = createMockDigest();
      const transcriptions = [createMockTranscription(1, BookmarkSource.YOUTUBE)];

      mockRepo.findByDate
        .mockResolvedValueOnce(existingDigest)
        .mockResolvedValueOnce({
          ...existingDigest,
          digest_content: "Regenerated digest",
        });

      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue(transcriptions);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.markAsProcessing.mockResolvedValue(undefined);
      mockRepo.markAsCompleted.mockResolvedValue(undefined);
      mockGenerateDigest.mockResolvedValue("Regenerated digest");

      const result = await service.generateDailyDigest({
        date: testDate,
        userId,
        forceRegenerate: true,
      });

      expect(mockRepo.markAsProcessing).toHaveBeenCalledWith(existingDigest.id);
      expect(mockGenerateDigest).toHaveBeenCalled();
      expect(result.digest_content).toBe("Regenerated digest");
    });

    it("should create new digest with transcriptions", async () => {
      const transcriptions = [
        createMockTranscription(1, BookmarkSource.YOUTUBE, 300),
        createMockTranscription(2, BookmarkSource.YOUTUBE, 400),
        createMockTranscription(3, BookmarkSource.PODCAST, 200),
      ];

      const newDigest = createMockDigest({ id: 99, bookmark_count: 3 });

      mockRepo.findByDate
        .mockResolvedValueOnce(null) // No existing digest
        .mockResolvedValueOnce({     // After completion
          ...newDigest,
          digest_content: "New digest content",
        });

      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue(transcriptions);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.create.mockResolvedValue(newDigest);
      mockRepo.markAsCompleted.mockResolvedValue(undefined);
      mockGenerateDigest.mockResolvedValue("New digest content");

      const result = await service.generateDailyDigest({
        date: testDate,
        userId,
        forceRegenerate: false,
      });

      expect(mockRepo.create).toHaveBeenCalledWith({
        digestDate: testDate,
        userId: userId,
        bookmarkCount: 3,
        sourcesBreakdown: { youtube: 2, podcast: 1 },
        dateRangeStart: expect.any(Date),
        dateRangeEnd: expect.any(Date),
      });

      // Verify generateDigest received unified DigestContentItem format (audio items)
      const [createdDigestItems, createdDigestContext] = getLastDigestCall();
      expect(createdDigestItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            content_type: 'audio',
            source: BookmarkSource.YOUTUBE,
          }),
          expect.objectContaining({
            content_type: 'audio',
            source: BookmarkSource.YOUTUBE,
          }),
          expect.objectContaining({
            content_type: 'audio',
            source: BookmarkSource.PODCAST,
          }),
        ])
      );
      expect(createdDigestContext).toEqual(
        expect.objectContaining({
          digestDate: digestDateLabel,
          totalItems: 3,
          audioCount: 3,
          articleCount: 0,
        })
      );
      expect(mockRepo.markAsCompleted).toHaveBeenCalledWith(
        newDigest.id,
        "New digest content",
        900, // 300 + 400 + 200
        expect.any(Object)
      );
      expect(result.digest_content).toBe("New digest content");
    });

    it("should handle empty transcriptions list", async () => {
      const newDigest = createMockDigest({ id: 100, bookmark_count: 0 });

      mockRepo.findByDate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...newDigest,
          digest_content: null,
        });

      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue([]);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.create.mockResolvedValue(newDigest);
      mockRepo.markAsCompleted.mockResolvedValue(undefined);

      const result = await service.generateDailyDigest({
        date: testDate,
        forceRegenerate: false,
      });

      expect(mockRepo.create).toHaveBeenCalledWith({
        digestDate: testDate,
        userId: null,
        bookmarkCount: 0,
        sourcesBreakdown: {},
        dateRangeStart: expect.any(Date),
        dateRangeEnd: expect.any(Date),
      });

      // Should not call map-reduce for empty list
      expect(mockGenerateDigest).not.toHaveBeenCalled();

      expect(mockRepo.markAsCompleted).toHaveBeenCalledWith(
        newDigest.id,
        null,
        0,
        expect.any(Object)
      );
      expect(result.digest_content).toBeNull();
    });

    it("should calculate correct sources breakdown", async () => {
      const transcriptions = [
        createMockTranscription(1, BookmarkSource.YOUTUBE),
        createMockTranscription(2, BookmarkSource.YOUTUBE),
        createMockTranscription(3, BookmarkSource.YOUTUBE),
        createMockTranscription(4, BookmarkSource.PODCAST),
        createMockTranscription(5, BookmarkSource.REDDIT),
      ];

      const newDigest = createMockDigest();

      mockRepo.findByDate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newDigest);
      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue(transcriptions);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.create.mockResolvedValue(newDigest);
      mockRepo.markAsCompleted.mockResolvedValue(undefined);
      mockGenerateDigest.mockResolvedValue("Digest");

      await service.generateDailyDigest({
        date: testDate,
        forceRegenerate: false,
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourcesBreakdown: {
            youtube: 3,
            podcast: 1,
            reddit: 1,
          },
        })
      );
    });

    it("should calculate correct total duration", async () => {
      const transcriptions = [
        createMockTranscription(1, BookmarkSource.YOUTUBE, 150),
        createMockTranscription(2, BookmarkSource.PODCAST, 300),
        createMockTranscription(3, BookmarkSource.YOUTUBE, 450),
      ];

      const newDigest = createMockDigest();

      mockRepo.findByDate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newDigest);
      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue(transcriptions);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.create.mockResolvedValue(newDigest);
      mockRepo.markAsCompleted.mockResolvedValue(undefined);
      mockGenerateDigest.mockResolvedValue("Digest");

      await service.generateDailyDigest({
        date: testDate,
        forceRegenerate: false,
      });

      expect(mockRepo.markAsCompleted).toHaveBeenCalledWith(
        newDigest.id,
        "Digest",
        900, // 150 + 300 + 450
        expect.any(Object)
      );
    });

    it("should handle mixed content (audio + web)", async () => {
      const transcriptions = [
        createMockTranscription(1, BookmarkSource.YOUTUBE, 300),
        createMockTranscription(2, BookmarkSource.PODCAST, 200),
      ];

      const webContent = [
        createMockWebContent(3, BookmarkSource.BLOG, 1000),
        createMockWebContent(4, BookmarkSource.REDDIT, 500),
      ];

      const newDigest = createMockDigest({ id: 101, bookmark_count: 4 });

      mockRepo.findByDate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...newDigest,
          digest_content: "Mixed content digest",
        });

      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue(transcriptions);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue(webContent);
      mockRepo.create.mockResolvedValue(newDigest);
      mockRepo.markAsCompleted.mockResolvedValue(undefined);
      mockGenerateDigest.mockResolvedValue("Mixed content digest");

      const result = await service.generateDailyDigest({
        date: testDate,
        forceRegenerate: false,
      });

      // Verify digest was created with correct metadata
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bookmarkCount: 4, // 2 audio + 2 web
          sourcesBreakdown: {
            youtube: 1,
            podcast: 1,
            blog: 1,
            reddit: 1,
          },
        })
      );

      // Verify total duration only includes audio (300 + 200)
      expect(mockRepo.markAsCompleted).toHaveBeenCalledWith(
        newDigest.id,
        "Mixed content digest",
        500, // Only audio duration
        expect.any(Object)
      );

      // Verify mockGenerateDigest received unified content (both audio + articles)
      const [mixedItems, mixedContext] = getLastDigestCall();
      expect(mixedItems).toEqual(
        expect.arrayContaining([
          // Audio items
          expect.objectContaining({
            bookmark_id: 1,
            content_type: 'audio',
            source: BookmarkSource.YOUTUBE,
            duration: 300,
          }),
          expect.objectContaining({
            bookmark_id: 2,
            content_type: 'audio',
            source: BookmarkSource.PODCAST,
            duration: 200,
          }),
          // Article items
          expect.objectContaining({
            bookmark_id: 3,
            content_type: 'article',
            source: BookmarkSource.BLOG,
            word_count: 1000,
          }),
          expect.objectContaining({
            bookmark_id: 4,
            content_type: 'article',
            source: BookmarkSource.REDDIT,
            word_count: 500,
          }),
        ])
      );
      expect(mixedContext).toEqual(
        expect.objectContaining({
          digestDate: digestDateLabel,
          totalItems: 4,
          audioCount: 2,
          articleCount: 2,
        })
      );

      // Verify both queries were called
      expect(mockRepo.getCompletedTranscriptionsInRange).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        undefined
      );
      expect(mockRepo.getCompletedWebContentInRange).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        undefined
      );

      expect(result.digest_content).toBe("Mixed content digest");
    });

    it("should use correct date range for transcription fetch", async () => {
      const transcriptions = [createMockTranscription(1, BookmarkSource.YOUTUBE)];
      const newDigest = createMockDigest();

      mockRepo.findByDate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newDigest);
      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue(transcriptions);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.create.mockResolvedValue(newDigest);
      mockRepo.markAsCompleted.mockResolvedValue(undefined);
      mockGenerateDigest.mockResolvedValue("Digest");

      await service.generateDailyDigest({
        date: testDate,
        forceRegenerate: false,
      });

      const startDate = new Date("2025-01-15T00:00:00.000Z");
      const endDate = new Date("2025-01-15T23:59:59.999Z");

      expect(mockRepo.getCompletedTranscriptionsInRange).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        undefined
      );

      const [actualStart, actualEnd] = mockRepo.getCompletedTranscriptionsInRange.mock.calls[0];

      // Check dates match (ignore milliseconds due to timezone)
      expect(actualStart.toISOString().substring(0, 19)).toBe(
        startDate.toISOString().substring(0, 19)
      );
      expect(actualEnd.toISOString().substring(0, 19)).toBe(
        endDate.toISOString().substring(0, 19)
      );
    });

    it("should handle map-reduce service errors", async () => {
      const transcriptions = [createMockTranscription(1, BookmarkSource.YOUTUBE)];
      const newDigest = createMockDigest();

      mockRepo.findByDate.mockResolvedValue(null);
      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue(transcriptions);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.create.mockResolvedValue(newDigest);
      mockGenerateDigest.mockRejectedValue(
        new Error("OpenAI API error")
      );

      await expect(
        service.generateDailyDigest({
          date: testDate,
          forceRegenerate: false,
        })
      ).rejects.toThrow("Failed to generate daily digest: OpenAI API error");

      expect(mockRepo.markAsCompleted).not.toHaveBeenCalled();
    });

    it("should handle repository errors during creation", async () => {
      mockRepo.findByDate.mockResolvedValue(null);
      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue([
        createMockTranscription(1, BookmarkSource.YOUTUBE),
      ]);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.create.mockRejectedValue(new Error("Database connection error"));

      await expect(
        service.generateDailyDigest({
          date: testDate,
          forceRegenerate: false,
        })
      ).rejects.toThrow("Failed to generate daily digest: Database connection error");
    });

    it("should handle repository errors during transcription fetch", async () => {
      mockRepo.findByDate.mockResolvedValue(null);
      mockRepo.getCompletedTranscriptionsInRange.mockRejectedValue(
        new Error("Query timeout")
      );
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content (won't be called due to error)

      await expect(
        service.generateDailyDigest({
          date: testDate,
          forceRegenerate: false,
        })
      ).rejects.toThrow("Failed to generate daily digest: Query timeout");
    });

    it("should throw error if completed digest cannot be retrieved", async () => {
      const transcriptions = [createMockTranscription(1, BookmarkSource.YOUTUBE)];
      const newDigest = createMockDigest();

      mockRepo.findByDate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null); // Cannot retrieve after completion

      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue(transcriptions);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.create.mockResolvedValue(newDigest);
      mockRepo.markAsCompleted.mockResolvedValue(undefined);
      mockGenerateDigest.mockResolvedValue("Digest");

      await expect(
        service.generateDailyDigest({
          date: testDate,
          forceRegenerate: false,
        })
      ).rejects.toThrow("Failed to retrieve completed digest");
    });

    it("should work with global digest (no userId)", async () => {
      const transcriptions = [createMockTranscription(1, BookmarkSource.YOUTUBE)];
      const newDigest = createMockDigest({ user_id: null });

      mockRepo.findByDate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newDigest);
      mockRepo.getCompletedTranscriptionsInRange.mockResolvedValue(transcriptions);
      mockRepo.getCompletedWebContentInRange.mockResolvedValue([]); // No web content
      mockRepo.create.mockResolvedValue(newDigest);
      mockRepo.markAsCompleted.mockResolvedValue(undefined);
      mockGenerateDigest.mockResolvedValue("Global digest");

      const result = await service.generateDailyDigest({
        date: testDate,
        forceRegenerate: false,
        // No userId provided
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
        })
      );

      expect(mockRepo.findByDate).toHaveBeenCalledWith(testDate, undefined);
      expect(result.user_id).toBeNull();
    });
  });

  describe("getDigestByDate", () => {
    it("should fetch digest by date", async () => {
      const testDate = new Date("2025-01-15");
      const mockDigest = { id: 1, digest_date: testDate } as DailyDigest;

      mockRepo.findByDate.mockResolvedValue(mockDigest);

      const result = await service.getDigestByDate(testDate);

      expect(result).toEqual(mockDigest);
      expect(mockRepo.findByDate).toHaveBeenCalledWith(testDate, undefined);
    });

    it("should fetch digest by date and userId", async () => {
      const testDate = new Date("2025-01-15");
      const userId = "user-456";
      const mockDigest = { id: 1, digest_date: testDate, user_id: userId } as DailyDigest;

      mockRepo.findByDate.mockResolvedValue(mockDigest);

      const result = await service.getDigestByDate(testDate, userId);

      expect(result).toEqual(mockDigest);
      expect(mockRepo.findByDate).toHaveBeenCalledWith(testDate, userId);
    });

    it("should return null if digest not found", async () => {
      const testDate = new Date("2025-01-15");

      mockRepo.findByDate.mockResolvedValue(null);

      const result = await service.getDigestByDate(testDate);

      expect(result).toBeNull();
    });
  });

  describe("listDigests", () => {
    it("should list digests with pagination", async () => {
      const mockDigests = [
        { id: 1, digest_date: new Date("2025-01-15") },
        { id: 2, digest_date: new Date("2025-01-14") },
      ] as DailyDigest[];

      mockRepo.list.mockResolvedValue({
        digests: mockDigests,
        total: 10,
      });

      const result = await service.listDigests({
        limit: 2,
        offset: 0,
      });

      expect(result.digests).toEqual(mockDigests);
      expect(result.total).toBe(10);
      expect(mockRepo.list).toHaveBeenCalledWith({
        limit: 2,
        offset: 0,
      });
    });

    it("should list digests for specific user", async () => {
      const userId = "user-789";
      const mockDigests = [{ id: 1, user_id: userId }] as DailyDigest[];

      mockRepo.list.mockResolvedValue({
        digests: mockDigests,
        total: 5,
      });

      const result = await service.listDigests({
        limit: 10,
        offset: 0,
        userId,
      });

      expect(result.digests).toEqual(mockDigests);
      expect(mockRepo.list).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        userId,
      });
    });
  });
});
