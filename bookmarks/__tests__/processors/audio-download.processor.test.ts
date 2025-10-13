/**
 * Audio Download Processor Tests
 *
 * Unit tests for the unified audio download processor that:
 * - Filters sources that require audio processing
 * - Handles YouTube and Podcast downloads
 * - Ensures idempotency (skips duplicate processing)
 * - Publishes audio-downloaded events
 * - Cleans up on failures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookmarkSource } from "../../types/domain.types";

// Hoist mock functions for use in module mocks
const {
  mockYouTubeDownloadAndUpload,
  mockPodcastDownloadAndUpload,
  mockExtractYouTubeVideoId,
  mockFindByBookmarkId,
  mockCreatePending,
  mockMarkAsProcessing,
  mockMarkAsFailed,
  mockPublish,
  mockRemove,
  mockLog,
} = vi.hoisted(() => ({
  mockYouTubeDownloadAndUpload: vi.fn(),
  mockPodcastDownloadAndUpload: vi.fn(),
  mockExtractYouTubeVideoId: vi.fn(),
  mockFindByBookmarkId: vi.fn(),
  mockCreatePending: vi.fn(),
  mockMarkAsProcessing: vi.fn(),
  mockMarkAsFailed: vi.fn(),
  mockPublish: vi.fn(),
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
  },
}));

vi.mock("../../utils/youtube-url.util", () => ({
  extractYouTubeVideoId: mockExtractYouTubeVideoId,
}));

vi.mock("../../events/audio-downloaded.events", () => ({
  audioDownloadedTopic: {
    publish: mockPublish,
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

    it("should process YouTube source", async () => {
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
      mockYouTubeDownloadAndUpload.mockResolvedValue("audio-2-dQw4w9WgXcQ.mp3");
      mockPublish.mockResolvedValue("msg-123");

      await handleAudioDownload(event);

      expect(mockYouTubeDownloadAndUpload).toHaveBeenCalledWith("dQw4w9WgXcQ", 2);
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 2,
        audioBucketKey: "audio-2-dQw4w9WgXcQ.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: { videoId: "dQw4w9WgXcQ" },
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
      mockYouTubeDownloadAndUpload.mockResolvedValue("audio-5-abc123.mp3");
      mockPublish.mockResolvedValue("msg-789");

      await handleAudioDownload(event);

      expect(mockCreatePending).not.toHaveBeenCalled(); // Already exists
      expect(mockMarkAsProcessing).toHaveBeenCalledWith(5);
      expect(mockYouTubeDownloadAndUpload).toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalled();
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
      mockYouTubeDownloadAndUpload.mockResolvedValue("audio-6-xyz.mp3");
      mockPublish.mockResolvedValue("msg-abc");

      await handleAudioDownload(event);

      expect(mockCreatePending).toHaveBeenCalledWith(6);
      expect(mockMarkAsProcessing).toHaveBeenCalledWith(6);
      expect(mockYouTubeDownloadAndUpload).toHaveBeenCalled();
    });
  });

  describe("YouTube Download", () => {
    it("should extract video ID and call YouTube downloader", async () => {
      const event = {
        bookmarkId: 7,
        url: "https://www.youtube.com/watch?v=videoID123",
        source: BookmarkSource.YOUTUBE,
        title: "Video Title",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("videoID123");
      mockYouTubeDownloadAndUpload.mockResolvedValue("audio-7-videoID123.mp3");
      mockPublish.mockResolvedValue("msg-def");

      await handleAudioDownload(event);

      expect(mockExtractYouTubeVideoId).toHaveBeenCalledWith(event.url);
      expect(mockYouTubeDownloadAndUpload).toHaveBeenCalledWith("videoID123", 7);
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 7,
        audioBucketKey: "audio-7-videoID123.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: { videoId: "videoID123" },
      });
    });

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

      expect(mockYouTubeDownloadAndUpload).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        8,
        "Audio download failed: Invalid YouTube URL: could not extract video ID"
      );
    });

    it("should mark as processing before downloading", async () => {
      const event = {
        bookmarkId: 9,
        url: "https://www.youtube.com/watch?v=test",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("test");
      mockYouTubeDownloadAndUpload.mockResolvedValue("audio-9-test.mp3");
      mockPublish.mockResolvedValue("msg-ghi");

      await handleAudioDownload(event);

      expect(mockMarkAsProcessing).toHaveBeenCalledWith(9);
      expect(mockYouTubeDownloadAndUpload).toHaveBeenCalled();
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

  describe("Error Handling", () => {
    it("should clean up bucket on failure after upload", async () => {
      const event = {
        bookmarkId: 12,
        url: "https://www.youtube.com/watch?v=cleanup",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("cleanup");
      mockYouTubeDownloadAndUpload.mockResolvedValue("audio-12-cleanup.mp3");
      mockPublish.mockRejectedValue(new Error("Publish failed")); // Fail after upload
      mockRemove.mockResolvedValue(undefined);
      mockMarkAsFailed.mockResolvedValue(undefined);

      await handleAudioDownload(event);

      expect(mockRemove).toHaveBeenCalledWith("audio-12-cleanup.mp3");
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        12,
        "Audio download failed: Publish failed"
      );
    });

    it("should mark as failed on download error", async () => {
      const event = {
        bookmarkId: 13,
        url: "https://www.youtube.com/watch?v=error",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("error");
      mockYouTubeDownloadAndUpload.mockRejectedValue(
        new Error("Download failed")
      );

      await handleAudioDownload(event);

      expect(mockPublish).not.toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalledWith(
        13,
        "Audio download failed: Download failed"
      );
    });

    it("should not clean up bucket if upload never succeeded", async () => {
      const event = {
        bookmarkId: 14,
        url: "https://www.youtube.com/watch?v=noupload",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("noupload");
      mockYouTubeDownloadAndUpload.mockRejectedValue(
        new Error("Upload failed")
      );

      await handleAudioDownload(event);

      expect(mockRemove).not.toHaveBeenCalled(); // No cleanup if upload failed
      expect(mockMarkAsFailed).toHaveBeenCalled();
    });

    it("should handle cleanup failure gracefully", async () => {
      const event = {
        bookmarkId: 15,
        url: "https://www.youtube.com/watch?v=cleanupfail",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("cleanupfail");
      mockYouTubeDownloadAndUpload.mockResolvedValue("audio-15-cleanupfail.mp3");
      mockPublish.mockRejectedValue(new Error("Publish failed"));
      mockRemove.mockRejectedValue(new Error("Cleanup failed")); // Cleanup fails too
      mockMarkAsFailed.mockResolvedValue(undefined);

      await handleAudioDownload(event);

      expect(mockRemove).toHaveBeenCalled();
      expect(mockMarkAsFailed).toHaveBeenCalled(); // Should still mark as failed
    });
  });

  describe("Event Publishing", () => {
    it("should publish audio-downloaded event with correct structure", async () => {
      const event = {
        bookmarkId: 16,
        url: "https://www.youtube.com/watch?v=publish",
        source: BookmarkSource.YOUTUBE,
        title: "Publish Test",
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("publish");
      mockYouTubeDownloadAndUpload.mockResolvedValue("audio-16-publish.mp3");
      mockPublish.mockResolvedValue("msg-mno");

      await handleAudioDownload(event);

      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledWith({
        bookmarkId: 16,
        audioBucketKey: "audio-16-publish.mp3",
        source: BookmarkSource.YOUTUBE,
        metadata: { videoId: "publish" },
      });
    });

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

  describe("Concurrent Processing", () => {
    it("should handle concurrent download requests", async () => {
      const events = [
        {
          bookmarkId: 18,
          url: "https://www.youtube.com/watch?v=concurrent1",
          source: BookmarkSource.YOUTUBE,
        },
        {
          bookmarkId: 19,
          url: "https://www.youtube.com/watch?v=concurrent2",
          source: BookmarkSource.YOUTUBE,
        },
        {
          bookmarkId: 20,
          url: "https://podcast.example.com/ep/20",
          source: BookmarkSource.PODCAST,
        },
      ];

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId
        .mockReturnValueOnce("concurrent1")
        .mockReturnValueOnce("concurrent2");
      mockYouTubeDownloadAndUpload
        .mockResolvedValueOnce("audio-18-concurrent1.mp3")
        .mockResolvedValueOnce("audio-19-concurrent2.mp3");
      mockPodcastDownloadAndUpload.mockResolvedValueOnce("audio-20-podcast.mp3");
      mockPublish.mockResolvedValue("msg-concurrent");

      await Promise.all(events.map((event) => handleAudioDownload(event)));

      expect(mockYouTubeDownloadAndUpload).toHaveBeenCalledTimes(2);
      expect(mockPodcastDownloadAndUpload).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledTimes(3);
    });
  });

  describe("Logging and Observability", () => {
    it("should log successful download", async () => {
      const event = {
        bookmarkId: 100,
        url: "https://www.youtube.com/watch?v=logging",
        source: BookmarkSource.YOUTUBE,
      };

      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("logging");
      mockYouTubeDownloadAndUpload.mockResolvedValue("audio-100-logging.mp3");
      mockPublish.mockResolvedValue("msg-123");

      await handleAudioDownload(event);

      expect(mockLog.info).toHaveBeenCalledWith(
        "Audio download completed",
        expect.objectContaining({
          bookmarkId: 100,
          audioBucketKey: "audio-100-logging.mp3",
        })
      );
    });

    it("should log errors when download fails", async () => {
      const event = {
        bookmarkId: 101,
        url: "https://www.youtube.com/watch?v=error",
        source: BookmarkSource.YOUTUBE,
      };

      const downloadError = new Error("Download failed");
      mockFindByBookmarkId.mockResolvedValue(null);
      mockCreatePending.mockResolvedValue(undefined);
      mockMarkAsProcessing.mockResolvedValue(undefined);
      mockExtractYouTubeVideoId.mockReturnValue("error");
      mockYouTubeDownloadAndUpload.mockRejectedValue(downloadError);

      await handleAudioDownload(event);

      expect(mockLog.error).toHaveBeenCalledWith(
        downloadError,
        "Audio download failed",
        expect.objectContaining({
          bookmarkId: 101,
        })
      );
    });

    it("should log when skipping non-audio sources", async () => {
      const event = {
        bookmarkId: 102,
        url: "https://example.com",
        source: BookmarkSource.WEB,
      };

      await handleAudioDownload(event);

      expect(mockLog.debug).toHaveBeenCalledWith(
        "Skipping audio download",
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
});
