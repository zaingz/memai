/**
 * Audio Download Processor Tests
 *
 * Unit tests for the unified audio download processor that:
 * - Filters sources that require audio processing
 * - YouTube: Uses Gemini API for direct transcription (Gemini ONLY - no yt-dlp fallback)
 * - Podcast: Downloads audio using yt-dlp and transcribes with Deepgram
 * - Ensures idempotency (skips duplicate processing)
 * - Publishes audio-transcribed events (YouTube) or audio-downloaded events (Podcast)
 * - Cleans up on failures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookmarkSource } from "../../types/domain.types";

// Hoist mock functions for use in module mocks
const {
  mockYouTubeDownloadAndUpload,
  mockPodcastDownloadAndUpload,
  mockExtractYouTubeVideoId,
  mockBuildYouTubeUrl,
  mockGeminiTranscribeYouTubeVideo,
  mockFindByBookmarkId,
  mockCreatePending,
  mockMarkAsProcessing,
  mockMarkAsFailed,
  mockUpdateGeminiTranscriptionData,
  mockPublish,
  mockAudioTranscribedPublish,
  mockRemove,
  mockLog,
} = vi.hoisted(() => ({
  mockYouTubeDownloadAndUpload: vi.fn(),
  mockPodcastDownloadAndUpload: vi.fn(),
  mockExtractYouTubeVideoId: vi.fn(),
  mockBuildYouTubeUrl: vi.fn(),
  mockGeminiTranscribeYouTubeVideo: vi.fn(),
  mockFindByBookmarkId: vi.fn(),
  mockCreatePending: vi.fn(),
  mockMarkAsProcessing: vi.fn(),
  mockMarkAsFailed: vi.fn(),
  mockUpdateGeminiTranscriptionData: vi.fn(),
  mockPublish: vi.fn(),
  mockAudioTranscribedPublish: vi.fn(),
  mockRemove: vi.fn(),
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

vi.mock("../../services/youtube-downloader.service", () => ({
  YouTubeDownloaderService: class MockYouTubeDownloaderService {
    downloadAndUpload = mockYouTubeDownloadAndUpload;
  },
}));

vi.mock("../../services/podcast-downloader.service", () => ({
  PodcastDownloaderService: class MockPodcastDownloaderService {
    downloadAndUpload = mockPodcastDownloadAndUpload;
  },
}));

vi.mock("../../repositories/transcription.repository", () => ({
  TranscriptionRepository: class MockTranscriptionRepository {
    findByBookmarkId = mockFindByBookmarkId;
    createPending = mockCreatePending;
    markAsProcessing = mockMarkAsProcessing;
    markAsFailed = mockMarkAsFailed;
    updateGeminiTranscriptionData = mockUpdateGeminiTranscriptionData;
  },
}));

vi.mock("../../services/gemini.service", () => ({
  GeminiService: class MockGeminiService {
    transcribeYouTubeVideo = mockGeminiTranscribeYouTubeVideo;
  },
}));

vi.mock("../../utils/youtube-url.util", () => ({
  extractYouTubeVideoId: mockExtractYouTubeVideoId,
  buildYouTubeUrl: mockBuildYouTubeUrl,
}));

vi.mock("../../events/audio-downloaded.events", () => ({
  audioDownloadedTopic: {
    publish: mockPublish,
  },
}));

vi.mock("../../events/audio-transcribed.events", () => ({
  audioTranscribedTopic: {
    publish: mockAudioTranscribedPublish,
  },
}));

vi.mock("../../storage", () => ({
  audioFilesBucket: {
    remove: mockRemove,
  },
}));

// Import after mocks
import { handleAudioDownload } from "../../processors/audio-download.processor";

describe("Audio Download Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper: Mock Gemini failure
   * NOTE: With Gemini-only mode, failures should mark transcription as failed (no fallback)
   * These helper mocks are kept for legacy test compatibility (podcasts still use yt-dlp)
   */
  const mockGeminiFailure = (videoId: string) => {
    mockBuildYouTubeUrl.mockReturnValue(`https://www.youtube.com/watch?v=${videoId}`);
    mockGeminiTranscribeYouTubeVideo.mockResolvedValue({
      transcript: "",
      confidence: 0,
      processingTime: 1000,
      method: "gemini" as const,
      error: "Private video",
    });
  };

  /**
   * Helper: Mock Gemini success
   */
  const mockGeminiSuccess = (videoId: string, transcript: string) => {
    mockBuildYouTubeUrl.mockReturnValue(`https://www.youtube.com/watch?v=${videoId}`);
    mockGeminiTranscribeYouTubeVideo.mockResolvedValue({
      transcript,
      confidence: 0.95,
      processingTime: 30000,
      method: "gemini" as const,
    });
  };

  describe("Source Filtering", () => {
    const nonAudioSources = [
      BookmarkSource.WEB,
      BookmarkSource.REDDIT,
      BookmarkSource.TWITTER,
      BookmarkSource.LINKEDIN,
      BookmarkSource.BLOG,
    ];

    nonAudioSources.forEach((source) => {
      it(`should skip processing for ${source} source`, async () => {
        const event = {
          bookmarkId: 1,
          url: "https://example.com",
          source,
          title: "Test",
        };

        await handleAudioDownload(event);

        expect(mockFindByBookmarkId).not.toHaveBeenCalled();
        expect(mockYouTubeDownloadAndUpload).not.toHaveBeenCalled();
        expect(mockPodcastDownloadAndUpload).not.toHaveBeenCalled();
        expect(mockPublish).not.toHaveBeenCalled();
      });
    });

    it("should process YouTube source with Gemini", async () => {
      const event = {
        bookmarkId: 2,
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        source: BookmarkSource.YOUTUBE,
        title: "Test Video",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("dQw4w9WgXcQ");
      mockGeminiSuccess("dQw4w9WgXcQ", "Test transcript");
      mockUpdateGeminiTranscriptionData.mockResolvedValue(undefined);
      mockAudioTranscribedPublish.mockResolvedValue("msg-123");

      await handleAudioDownload(event);

      expect(mockGeminiTranscribeYouTubeVideo).toHaveBeenCalled();
      expect(mockUpdateGeminiTranscriptionData).toHaveBeenCalledWith(2, {
        transcript: "Test transcript",
        confidence: 0.95,
      });
      expect(mockAudioTranscribedPublish).toHaveBeenCalledWith({
        bookmarkId: 2,
        transcript: "Test transcript",
        source: BookmarkSource.YOUTUBE,
      });
    });

    it("should process Podcast source", async () => {
      const event = {
        bookmarkId: 3,
        url: "https://podcasts.apple.com/podcast/episode",
        source: BookmarkSource.PODCAST,
        title: "Test Episode",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockPodcastDownloadAndUpload.mockResolvedValue("audio-3-podcast.mp3");
      mockPublish.mockResolvedValue("msg-456");

      await handleAudioDownload(event);

      expect(mockPodcastDownloadAndUpload).toHaveBeenCalledWith(
        "https://podcasts.apple.com/podcast/episode",
        3
      );
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 3,
        audioBucketKey: "audio-3-podcast.mp3",
        source: BookmarkSource.PODCAST,
        metadata: { episodeUrl: "https://podcasts.apple.com/podcast/episode" },
      });
    });
  });

  describe("Idempotency", () => {
    it("should skip if transcription already exists with non-pending status", async () => {
      const event = {
        bookmarkId: 4,
        url: "https://www.youtube.com/watch?v=test",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue({
        id: 1,
        bookmark_id: 4,
        status: "completed",
      });

      await handleAudioDownload(event);

      expect(mockFindByBookmarkId).toHaveBeenCalledWith(4);
      expect(mockCreatePending).not.toHaveBeenCalled();
      expect(mockYouTubeDownloadAndUpload).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("should process if transcription exists with pending status", async () => {
      const event = {
        bookmarkId: 5,
        url: "https://www.youtube.com/watch?v=abc123",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue({
        id: 2,
        bookmark_id: 5,
        status: "pending",
      });
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("abc123");
      mockGeminiSuccess("abc123", "Transcript for abc123");
      mockUpdateGeminiTranscriptionData.mockResolvedValue(undefined);
      mockAudioTranscribedPublish.mockResolvedValue("msg-789");

      await handleAudioDownload(event);

      expect(mockCreatePending).not.toHaveBeenCalled(); // Already exists
      expect(mockMarkAsProcessing).toHaveBeenCalledWith(5);
      expect(mockGeminiTranscribeYouTubeVideo).toHaveBeenCalled();
      expect(mockAudioTranscribedPublish).toHaveBeenCalled();
    });

    it("should create pending transcription if not exists", async () => {
      const event = {
        bookmarkId: 6,
        url: "https://www.youtube.com/watch?v=xyz",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("xyz");
      mockGeminiSuccess("xyz", "Transcript for xyz");
      mockUpdateGeminiTranscriptionData.mockResolvedValue(undefined);
      mockAudioTranscribedPublish.mockResolvedValue("msg-abc");

      await handleAudioDownload(event);

      expect(mockCreatePending).toHaveBeenCalledWith(6);
      expect(mockMarkAsProcessing).toHaveBeenCalledWith(6);
      expect(mockGeminiTranscribeYouTubeVideo).toHaveBeenCalled();
    });
  });

  describe("Gemini Tier-Based Transcription", () => {
    it("should use Gemini TIER 1 successfully and skip audio download", async () => {
      const event = {
        bookmarkId: 50,
        url: "https://www.youtube.com/watch?v=gemini-success",
        source: BookmarkSource.YOUTUBE,
        title: "Gemini Test Video",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("gemini-success");
      mockGeminiSuccess("gemini-success", "This is the Gemini transcript.");
      mockUpdateGeminiTranscriptionData.mockResolvedValue(undefined);
      mockAudioTranscribedPublish.mockResolvedValue("msg-gemini");

      await handleAudioDownload(event);

      // Verify Gemini was called
      expect(mockGeminiTranscribeYouTubeVideo).toHaveBeenCalled();

      // Verify transcript was stored
      expect(mockUpdateGeminiTranscriptionData).toHaveBeenCalledWith(50, {
        transcript: "This is the Gemini transcript.",
        confidence: 0.95,
      });

      // Verify audio-transcribed event was published (skipping download)
      expect(mockAudioTranscribedPublish).toHaveBeenCalledWith({
        bookmarkId: 50,
        transcript: "This is the Gemini transcript.",
        source: BookmarkSource.YOUTUBE,
      });

      // Verify audio download was NOT called (TIER 1 success)
      expect(mockYouTubeDownloadAndUpload).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled(); // audio-downloaded topic
    });

    it("should mark as failed when Gemini fails (Gemini ONLY - no fallback)", async () => {
      const event = {
        bookmarkId: 51,
        url: "https://www.youtube.com/watch?v=gemini-fail",
        source: BookmarkSource.YOUTUBE,
        title: "Private Video",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("gemini-fail");
      mockGeminiFailure("gemini-fail");
      mockMarkAsFailed.mockResolvedValue(undefined);

      await handleAudioDownload(event);

      // Verify Gemini was attempted
      expect(mockGeminiTranscribeYouTubeVideo).toHaveBeenCalled();

      // Verify transcription was marked as failed (Gemini ONLY - no fallback)
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        51,
        "Audio download failed: Gemini transcription failed: Private video"
      );

      // Verify NO fallback to yt-dlp
      expect(mockYouTubeDownloadAndUpload).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();

      // Verify Gemini data was NOT stored
      expect(mockUpdateGeminiTranscriptionData).not.toHaveBeenCalled();
      expect(mockAudioTranscribedPublish).not.toHaveBeenCalled();
    });
  });

  describe("YouTube URL Validation", () => {
    it("should throw error if YouTube URL is invalid", async () => {
      const event = {
        bookmarkId: 8,
        url: "https://invalid-url.com",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue(null); // Invalid URL

      await handleAudioDownload(event);

      expect(mockGeminiTranscribeYouTubeVideo).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        8,
        "Audio download failed: Invalid YouTube URL: could not extract video ID"
      );
    });
  });

  describe("Podcast Download", () => {
    it("should call podcast downloader with URL", async () => {
      const event = {
        bookmarkId: 10,
        url: "https://podcast.example.com/episode/123",
        source: BookmarkSource.PODCAST,
        title: "Episode 123",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockPodcastDownloadAndUpload.mockResolvedValue("audio-10-podcast.mp3");
      mockPublish.mockResolvedValue("msg-jkl");

      await handleAudioDownload(event);

      expect(mockPodcastDownloadAndUpload).toHaveBeenCalledWith(event.url, 10);
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 10,
        audioBucketKey: "audio-10-podcast.mp3",
        source: BookmarkSource.PODCAST,
        metadata: { episodeUrl: event.url },
      });
    });

    it("should handle podcast download failure", async () => {
      const event = {
        bookmarkId: 11,
        url: "https://podcast.example.com/invalid",
        source: BookmarkSource.PODCAST,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockPodcastDownloadAndUpload.mockRejectedValue(
        new Error("Failed to download podcast")
      );

      await handleAudioDownload(event);

      expect(mockPublish).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        11,
        "Audio download failed: Failed to download podcast"
      );
    });
  });

  describe("Event Publishing", () => {
    it("should include episodeUrl metadata for podcasts", async () => {
      const event = {
        bookmarkId: 17,
        url: "https://podcast.example.com/ep/17",
        source: BookmarkSource.PODCAST,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockPodcastDownloadAndUpload.mockResolvedValue("audio-17-podcast.mp3");
      mockPublish.mockResolvedValue("msg-pqr");

      await handleAudioDownload(event);

      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 17,
        audioBucketKey: "audio-17-podcast.mp3",
        source: BookmarkSource.PODCAST,
        metadata: { episodeUrl: "https://podcast.example.com/ep/17" },
      });
    });
  });

  describe("Logging and Observability", () => {
    it("should log when skipping non-audio sources", async () => {
      const event = {
        bookmarkId: 102,
        url: "https://example.com",
        source: BookmarkSource.WEB,
      };

      await handleAudioDownload(event);

      expect(mockLog.info).toHaveBeenCalledWith(
        "Source does not require audio processing, skipping",
        expect.objectContaining({
          bookmarkId: 102,
          source: BookmarkSource.WEB,
        })
      );
    });
  });

  describe("Handler Function", () => {
    it("should export handler function", () => {
      expect(handleAudioDownload).toBeDefined();
      expect(typeof handleAudioDownload).toBe("function");
    });
  });

  /**
   * INTEGRATION TESTS: Enhanced Idempotency & State Transitions
   * These tests verify processor behavior with focus on state management
   */
  describe("Idempotency (Integration - Enhanced)", () => {
    it("should skip processing when transcription is already completed", async () => {
      const event = {
        bookmarkId: 1000,
        url: "https://www.youtube.com/watch?v=completed-test",
        source: BookmarkSource.YOUTUBE,
      };

      // Transcription already completed
      mockFindByBookmarkId.mockResolvedValue({
        id: 1,
        bookmark_id: 1000,
        status: "completed",
        transcript: "Existing transcript",
      });

      await handleAudioDownload(event);

      // Should skip processing entirely
      expect(mockCreatePending).not.toHaveBeenCalled();
      expect(mockMarkAsProcessing).not.toHaveBeenCalled();
      expect(mockGeminiTranscribeYouTubeVideo).not.toHaveBeenCalled();
      expect(mockAudioTranscribedPublish).not.toHaveBeenCalled();
    });

    it("should handle concurrent duplicate events gracefully", async () => {
      const event = {
        bookmarkId: 1001,
        url: "https://www.youtube.com/watch?v=concurrent-test",
        source: BookmarkSource.YOUTUBE,
      };

      // First call: no existing record
      // Second call: record exists with 'processing' status
      mockFindByBookmarkId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, bookmark_id: 1001, status: "processing" });

      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("concurrent-test");
      mockGeminiSuccess("concurrent-test", "Concurrent transcript");
      mockUpdateGeminiTranscriptionData.mockResolvedValue(undefined);
      mockAudioTranscribedPublish.mockResolvedValue("msg-concurrent");

      // Process same event twice simultaneously
      const results = await Promise.all([
        handleAudioDownload(event),
        handleAudioDownload(event),
      ]);

      // First should process, second should skip
      expect(mockFindByBookmarkId).toHaveBeenCalledTimes(2);
      expect(mockCreatePending).toHaveBeenCalledTimes(1); // Only first call
    });
  });

  describe("State Transitions (Integration)", () => {
    it("should transition: pending → processing → completed (YouTube)", async () => {
      const event = {
        bookmarkId: 2000,
        url: "https://www.youtube.com/watch?v=state-test",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("state-test");
      mockGeminiSuccess("state-test", "State test transcript");
      mockUpdateGeminiTranscriptionData.mockResolvedValue(undefined);
      mockAudioTranscribedPublish.mockResolvedValue("msg-state");

      await handleAudioDownload(event);

      // Verify state transitions
      expect(mockCreatePending).toHaveBeenCalledWith(2000); // pending
      expect(mockMarkAsProcessing).toHaveBeenCalledWith(2000); // processing
      expect(mockUpdateGeminiTranscriptionData).toHaveBeenCalled(); // stores data (completed)
    });

    it("should transition to 'failed' on Gemini error", async () => {
      const event = {
        bookmarkId: 2001,
        url: "https://www.youtube.com/watch?v=fail-test",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("fail-test");
      mockGeminiFailure("fail-test");
      mockMarkAsFailed.mockResolvedValue(undefined);

      await handleAudioDownload(event);

      // Should mark as failed
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        2001,
        expect.stringContaining("Gemini transcription failed")
      );
    });

    it("should persist state before publishing next event (Podcast)", async () => {
      const event = {
        bookmarkId: 2002,
        url: "https://podcast.example.com/episode",
        source: BookmarkSource.PODCAST,
      };

      let createPendingCalled = false;
      let markAsProcessingCalled = false;
      let publishCalled = false;

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockImplementation(async () => {
        createPendingCalled = true;
        expect(markAsProcessingCalled).toBe(false);
        expect(publishCalled).toBe(false);
      });
      mockMarkAsProcessing.mockImplementation(async () => {
        markAsProcessingCalled = true;
        expect(createPendingCalled).toBe(true);
        expect(publishCalled).toBe(false);
      });
      mockPodcastDownloadAndUpload.mockResolvedValue("audio-2002-podcast.mp3");
      mockPublish.mockImplementation(async () => {
        publishCalled = true;
        expect(createPendingCalled).toBe(true);
        expect(markAsProcessingCalled).toBe(true);
        return "msg-order";
      });

      await handleAudioDownload(event);

      // Verify execution order
      expect(createPendingCalled).toBe(true);
      expect(markAsProcessingCalled).toBe(true);
      expect(publishCalled).toBe(true);
    });
  });
});
