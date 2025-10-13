/**
 * Audio Transcription Processor Tests
 *
 * Unit tests for the audio transcription processor that:
 * - Downloads audio from bucket
 * - Transcribes with Deepgram
 * - Extracts and stores transcription data
 * - Publishes audio-transcribed events
 * - Cleans up bucket on success and failure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookmarkSource } from "../../types/domain.types";

// Hoist mock functions for use in module mocks
const {
  mockDownload,
  mockRemove,
  mockTranscribe,
  mockExtractDeepgramData,
  mockUpdateTranscriptionData,
  mockMarkAsFailed,
  mockPublish,
  mockLog,
} = vi.hoisted(() => ({
  mockDownload: vi.fn(),
  mockRemove: vi.fn(),
  mockTranscribe: vi.fn(),
  mockExtractDeepgramData: vi.fn(),
  mockUpdateTranscriptionData: vi.fn(),
  mockMarkAsFailed: vi.fn(),
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

vi.mock("encore.dev/config", () => ({
  secret: () => () => "mock-deepgram-api-key",
}));

vi.mock("../../storage", () => ({
  audioFilesBucket: {
    download: mockDownload,
    remove: mockRemove,
  },
}));

vi.mock("../../services/deepgram.service", () => ({
  DeepgramService: class MockDeepgramService {
    transcribe = mockTranscribe;
  },
}));

vi.mock("../../utils/deepgram-extractor.util", () => ({
  extractDeepgramData: mockExtractDeepgramData,
}));

vi.mock("../../repositories/transcription.repository", () => ({
  TranscriptionRepository: class MockTranscriptionRepository {
    updateTranscriptionData = mockUpdateTranscriptionData;
    markAsFailed = mockMarkAsFailed;
  },
}));

vi.mock("../../events/audio-transcribed.events", () => ({
  audioTranscribedTopic: {
    publish: mockPublish,
  },
}));

// Import after mocks
import { handleAudioTranscription } from "../../processors/audio-transcription.processor";

describe("Audio Transcription Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Successful Transcription", () => {
    it("should download, transcribe, store, and publish for YouTube", async () => {
      const event = {
        bookmarkId: 1,
        audioBucketKey: "audio-1-video123.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: { videoId: "video123" },
      };

      const mockAudioBuffer = Buffer.from("mock audio data");
      const mockDeepgramResponse = {
        results: {
          channels: [{ alternatives: [{ transcript: "Mock transcript" }] }],
          intents: null,
          topics: null,
        },
      };
      const mockExtractedData = {
        transcript: "Mock transcript",
        confidence: 0.95,
        duration: 120,
        sentiment: "positive",
        sentimentScore: 0.8,
        deepgramSummary: "Mock summary",
      };

      mockDownload.mockResolvedValue(mockAudioBuffer);
      mockTranscribe.mockResolvedValue(mockDeepgramResponse);
      mockExtractDeepgramData.mockReturnValue(mockExtractedData);
      mockUpdateTranscriptionData.mockResolvedValue(undefined);
      mockRemove.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-123");

      await handleAudioTranscription(event);

      expect(mockDownload).toHaveBeenCalledWith("audio-1-video123.mp3");
      expect(mockTranscribe).toHaveBeenCalledWith(
        mockAudioBuffer,
        "audio-1-video123.mp3"
      );
      expect(mockExtractDeepgramData).toHaveBeenCalledWith(mockDeepgramResponse);
      expect(mockUpdateTranscriptionData).toHaveBeenCalledWith(1, {
        transcript: "Mock transcript",
        deepgramSummary: "Mock summary",
        sentiment: "positive",
        sentimentScore: 0.8,
        deepgramResponse: mockDeepgramResponse,
        duration: 120,
        confidence: 0.95,
      });
      expect(mockRemove).toHaveBeenCalledWith("audio-1-video123.mp3");
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 1,
        transcript: "Mock transcript",
        source: BookmarkSource.YOUTUBE,
      });
    });

    it("should handle podcast transcription", async () => {
      const event = {
        bookmarkId: 2,
        audioBucketKey: "audio-2-podcast.mp3",
        source: BookmarkSource.PODCAST,
        metadata: { episodeUrl: "https://podcast.example.com/ep/2" },
      };

      const mockAudioBuffer = Buffer.from("podcast audio");
      const mockDeepgramResponse = {
        results: {
          channels: [{ alternatives: [{ transcript: "Podcast transcript" }] }],
          intents: null,
          topics: null,
        },
      };
      const mockExtractedData = {
        transcript: "Podcast transcript",
        confidence: 0.92,
        duration: 1800,
        sentiment: "neutral",
        sentimentScore: 0.5,
        deepgramSummary: "Podcast summary",
      };

      mockDownload.mockResolvedValue(mockAudioBuffer);
      mockTranscribe.mockResolvedValue(mockDeepgramResponse);
      mockExtractDeepgramData.mockReturnValue(mockExtractedData);
      mockUpdateTranscriptionData.mockResolvedValue(undefined);
      mockRemove.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-456");

      await handleAudioTranscription(event);

      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 2,
        transcript: "Podcast transcript",
        source: BookmarkSource.PODCAST,
      });
    });
  });

  describe("Audio Download from Bucket", () => {
    it("should download audio buffer from bucket", async () => {
      const event = {
        bookmarkId: 3,
        audioBucketKey: "audio-3-test.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      const mockBuffer = Buffer.from("test audio");
      mockDownload.mockResolvedValue(mockBuffer);
      mockTranscribe.mockResolvedValue({
        results: {
          channels: [{ alternatives: [{ transcript: "Test" }] }],
        },
      });
      mockExtractDeepgramData.mockReturnValue({
        transcript: "Test",
        confidence: 0.9,
        duration: 60,
        sentiment: null,
        sentimentScore: null,
        deepgramSummary: null,
      });
      mockUpdateTranscriptionData.mockResolvedValue(undefined);
      mockRemove.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-789");

      await handleAudioTranscription(event);

      expect(mockDownload).toHaveBeenCalledWith("audio-3-test.mp3");
      expect(mockDownload).toHaveBeenCalledTimes(1);
    });

    it("should handle bucket download failure", async () => {
      const event = {
        bookmarkId: 4,
        audioBucketKey: "audio-4-missing.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      mockDownload.mockRejectedValue(new Error("File not found in bucket"));

      await handleAudioTranscription(event);

      expect(mockTranscribe).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        4,
        "Transcription failed: File not found in bucket"
      );
    });
  });

  describe("Deepgram Transcription", () => {
    it("should call Deepgram service with audio buffer and bucket key", async () => {
      const event = {
        bookmarkId: 5,
        audioBucketKey: "audio-5-deepgram.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      const mockBuffer = Buffer.from("deepgram test");
      mockDownload.mockResolvedValue(mockBuffer);
      mockTranscribe.mockResolvedValue({
        results: {
          channels: [{ alternatives: [{ transcript: "Deepgram transcript" }] }],
        },
      });
      mockExtractDeepgramData.mockReturnValue({
        transcript: "Deepgram transcript",
        confidence: 0.98,
        duration: 90,
        sentiment: "positive",
        sentimentScore: 0.9,
        deepgramSummary: "AI summary",
      });
      mockUpdateTranscriptionData.mockResolvedValue(undefined);
      mockRemove.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-abc");

      await handleAudioTranscription(event);

      expect(mockTranscribe).toHaveBeenCalledWith(mockBuffer, "audio-5-deepgram.mp3");
    });

    it("should handle transcription failure", async () => {
      const event = {
        bookmarkId: 6,
        audioBucketKey: "audio-6-fail.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      mockDownload.mockResolvedValue(Buffer.from("test"));
      mockTranscribe.mockRejectedValue(new Error("Deepgram API error"));

      await handleAudioTranscription(event);

      expect(mockUpdateTranscriptionData).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        6,
        "Transcription failed: Deepgram API error"
      );
    });
  });

  describe("Data Extraction and Storage", () => {
    it("should extract Deepgram data and store in database", async () => {
      const event = {
        bookmarkId: 7,
        audioBucketKey: "audio-7-extract.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      const mockDeepgramResponse = {
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: "Full transcript text",
                  confidence: 0.96,
                },
              ],
            },
          ],
          summary: { short: "Short summary" },
          sentiments: {
            average: { sentiment: "positive", sentiment_score: 0.85 },
          },
          intents: { intent: "informational" },
          topics: { topic: "technology" },
        },
        metadata: { duration: 180 },
      };

      const mockExtractedData = {
        transcript: "Full transcript text",
        confidence: 0.96,
        duration: 180,
        sentiment: "positive",
        sentimentScore: 0.85,
        deepgramSummary: "Short summary",
      };

      mockDownload.mockResolvedValue(Buffer.from("test"));
      mockTranscribe.mockResolvedValue(mockDeepgramResponse);
      mockExtractDeepgramData.mockReturnValue(mockExtractedData);
      mockUpdateTranscriptionData.mockResolvedValue(undefined);
      mockRemove.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-def");

      await handleAudioTranscription(event);

      expect(mockExtractDeepgramData).toHaveBeenCalledWith(mockDeepgramResponse);
      expect(mockUpdateTranscriptionData).toHaveBeenCalledWith(7, {
        transcript: "Full transcript text",
        deepgramSummary: "Short summary",
        sentiment: "positive",
        sentimentScore: 0.85,
        deepgramResponse: mockDeepgramResponse,
        duration: 180,
        confidence: 0.96,
      });
    });

    it("should handle database update failure", async () => {
      const event = {
        bookmarkId: 8,
        audioBucketKey: "audio-8-dbfail.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      mockDownload.mockResolvedValue(Buffer.from("test"));
      mockTranscribe.mockResolvedValue({
        results: {
          channels: [{ alternatives: [{ transcript: "Test" }] }],
        },
      });
      mockExtractDeepgramData.mockReturnValue({
        transcript: "Test",
        confidence: 0.9,
        duration: 60,
        sentiment: null,
        sentimentScore: null,
        deepgramSummary: null,
      });
      mockUpdateTranscriptionData.mockRejectedValue(
        new Error("Database connection failed")
      );

      await handleAudioTranscription(event);

      expect(mockPublish).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        8,
        "Transcription failed: Database connection failed"
      );
    });
  });

  describe("Bucket Cleanup", () => {
    it("should delete audio from bucket after successful transcription", async () => {
      const event = {
        bookmarkId: 9,
        audioBucketKey: "audio-9-cleanup.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      mockDownload.mockResolvedValue(Buffer.from("test"));
      mockTranscribe.mockResolvedValue({
        results: {
          channels: [{ alternatives: [{ transcript: "Cleanup test" }] }],
        },
      });
      mockExtractDeepgramData.mockReturnValue({
        transcript: "Cleanup test",
        confidence: 0.9,
        duration: 60,
        sentiment: null,
        sentimentScore: null,
        deepgramSummary: null,
      });
      mockUpdateTranscriptionData.mockResolvedValue(undefined);
      mockRemove.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-ghi");

      await handleAudioTranscription(event);

      expect(mockRemove).toHaveBeenCalledWith("audio-9-cleanup.mp3");
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it("should attempt cleanup on failure", async () => {
      const event = {
        bookmarkId: 10,
        audioBucketKey: "audio-10-failcleanup.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      mockDownload.mockResolvedValue(Buffer.from("test"));
      mockTranscribe.mockRejectedValue(new Error("Transcription failed"));
      mockRemove.mockResolvedValue(undefined);
      mockMarkAsFailed.mockResolvedValue(undefined);

      await handleAudioTranscription(event);

      expect(mockRemove).toHaveBeenCalledWith("audio-10-failcleanup.mp3");
      expect(mockMarkAsFailed).toHaveBeenCalled();
    });

    it("should handle cleanup failure gracefully", async () => {
      const event = {
        bookmarkId: 11,
        audioBucketKey: "audio-11-removefail.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      mockDownload.mockResolvedValue(Buffer.from("test"));
      mockTranscribe.mockRejectedValue(new Error("Transcription failed"));
      mockRemove.mockRejectedValue(new Error("Bucket remove failed"));
      mockMarkAsFailed.mockResolvedValue(undefined);

      await handleAudioTranscription(event);

      expect(mockRemove).toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        11,
        "Transcription failed: Transcription failed"
      );
    });
  });

  describe("Event Publishing", () => {
    it("should publish audio-transcribed event with correct structure", async () => {
      const event = {
        bookmarkId: 12,
        audioBucketKey: "audio-12-publish.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: { videoId: "publish123" },
      };

      mockDownload.mockResolvedValue(Buffer.from("test"));
      mockTranscribe.mockResolvedValue({
        results: {
          channels: [{ alternatives: [{ transcript: "Publish transcript" }] }],
        },
      });
      mockExtractDeepgramData.mockReturnValue({
        transcript: "Publish transcript",
        confidence: 0.95,
        duration: 120,
        sentiment: "neutral",
        sentimentScore: 0.5,
        deepgramSummary: "Publish summary",
      });
      mockUpdateTranscriptionData.mockResolvedValue(undefined);
      mockRemove.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-jkl");

      await handleAudioTranscription(event);

      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 12,
        transcript: "Publish transcript",
        source: BookmarkSource.YOUTUBE,
      });
    });

    it("should handle publish failure and still mark as failed", async () => {
      const event = {
        bookmarkId: 13,
        audioBucketKey: "audio-13-publishfail.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      mockDownload.mockResolvedValue(Buffer.from("test"));
      mockTranscribe.mockResolvedValue({
        results: {
          channels: [{ alternatives: [{ transcript: "Test" }] }],
        },
      });
      mockExtractDeepgramData.mockReturnValue({
        transcript: "Test",
        confidence: 0.9,
        duration: 60,
        sentiment: null,
        sentimentScore: null,
        deepgramSummary: null,
      });
      mockUpdateTranscriptionData.mockResolvedValue(undefined);
      mockRemove.mockResolvedValue(undefined);
      mockPublish.mockRejectedValue(new Error("Topic publish failed"));
      mockMarkAsFailed.mockResolvedValue(undefined);

      await handleAudioTranscription(event);

      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        13,
        "Transcription failed: Topic publish failed"
      );
    });
  });

  describe("Concurrent Processing", () => {
    it("should handle concurrent transcription requests", async () => {
      const events = [
        {
          bookmarkId: 14,
          audioBucketKey: "audio-14-concurrent1.mp3",
          source: BookmarkSource.YOUTUBE,
          metadata: {},
        },
        {
          bookmarkId: 15,
          audioBucketKey: "audio-15-concurrent2.mp3",
          source: BookmarkSource.PODCAST,
          metadata: {},
        },
        {
          bookmarkId: 16,
          audioBucketKey: "audio-16-concurrent3.mp3",
          source: BookmarkSource.YOUTUBE,
          metadata: {},
        },
      ];

      mockDownload.mockResolvedValue(Buffer.from("concurrent test"));
      mockTranscribe.mockResolvedValue({
        results: {
          channels: [{ alternatives: [{ transcript: "Concurrent" }] }],
        },
      });
      mockExtractDeepgramData.mockReturnValue({
        transcript: "Concurrent",
        confidence: 0.9,
        duration: 60,
        sentiment: null,
        sentimentScore: null,
        deepgramSummary: null,
      });
      mockUpdateTranscriptionData.mockResolvedValue(undefined);
      mockRemove.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-concurrent");

      await Promise.all(events.map((event) => handleAudioTranscription(event)));

      expect(mockDownload).toHaveBeenCalledTimes(3);
      expect(mockTranscribe).toHaveBeenCalledTimes(3);
      expect(mockUpdateTranscriptionData).toHaveBeenCalledTimes(3);
      expect(mockRemove).toHaveBeenCalledTimes(3);
      expect(mockPublish).toHaveBeenCalledTimes(3);
    });
  });

  describe("Logging and Observability", () => {
    it("should log successful transcription", async () => {
      const event = {
        bookmarkId: 100,
        audioBucketKey: "audio-100-logging.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      mockDownload.mockResolvedValue(Buffer.from("test"));
      mockTranscribe.mockResolvedValue({
        results: {
          channels: [{ alternatives: [{ transcript: "Logging test" }] }],
        },
      });
      mockExtractDeepgramData.mockReturnValue({
        transcript: "Logging test",
        confidence: 0.95,
        duration: 120,
        sentiment: "positive",
        sentimentScore: 0.8,
        deepgramSummary: "Test summary",
      });
      mockUpdateTranscriptionData.mockResolvedValue(undefined);
      mockRemove.mockResolvedValue(undefined);
      mockPublish.mockResolvedValue("msg-123");

      await handleAudioTranscription(event);

      expect(mockLog.info).toHaveBeenCalledWith(
        "Transcription completed",
        expect.objectContaining({
          bookmarkId: 100,
          confidence: 0.95,
        })
      );
    });

    it("should log errors when transcription fails", async () => {
      const event = {
        bookmarkId: 101,
        audioBucketKey: "audio-101-error.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      const transcriptionError = new Error("Deepgram API error");
      mockDownload.mockResolvedValue(Buffer.from("test"));
      mockTranscribe.mockRejectedValue(transcriptionError);
      mockRemove.mockResolvedValue(undefined);

      await handleAudioTranscription(event);

      expect(mockLog.error).toHaveBeenCalledWith(
        transcriptionError,
        "Transcription failed",
        expect.objectContaining({
          bookmarkId: 101,
        })
      );
    });

    it("should log errors when bucket download fails", async () => {
      const event = {
        bookmarkId: 102,
        audioBucketKey: "audio-102-missing.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: {},
      };

      const downloadError = new Error("File not found in bucket");
      mockDownload.mockRejectedValue(downloadError);

      await handleAudioTranscription(event);

      expect(mockLog.error).toHaveBeenCalledWith(
        downloadError,
        "Transcription failed",
        expect.objectContaining({
          bookmarkId: 102,
        })
      );
    });
  });

  describe("Handler Function", () => {
    it("should export handler function", () => {
      expect(handleAudioTranscription).toBeDefined();
      expect(typeof handleAudioTranscription).toBe("function");
    });
  });
});
