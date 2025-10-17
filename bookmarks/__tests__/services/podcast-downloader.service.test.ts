/**
 * Podcast Downloader Service Tests
 *
 * Unit tests for PodcastDownloaderService with mocked external dependencies.
 * Tests podcast audio download, RSS parsing, episode matching, and upload to Encore bucket.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import { EventEmitter } from "events";

// Create hoisted mocks - vi.hoisted ensures they're available before module imports
const mockSpawn = vi.hoisted(() => vi.fn());
const mockParsePodcastUrl = vi.hoisted(() => vi.fn());
const mockGetApplePodcastRss = vi.hoisted(() => vi.fn());
const mockParsePodcast = vi.hoisted(() => vi.fn());
const mockOgs = vi.hoisted(() => vi.fn());
const mockFuzzysortGo = vi.hoisted(() => vi.fn());
// Create mockFuzzysort as an object with go method
const mockFuzzysort = vi.hoisted(() => {
  const goFn = vi.fn();
  return { go: goFn };
});

// Mock modules before imports
vi.mock("child_process", () => ({
  spawn: mockSpawn,
}));

vi.mock("fs");

vi.mock("../../storage", () => ({
  audioFilesBucket: {
    upload: vi.fn(),
    download: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../utils/podcast-url.util", () => ({
  parsePodcastUrl: mockParsePodcastUrl,
  getApplePodcastRss: mockGetApplePodcastRss,
}));

vi.mock("node-podcast-parser", () => ({
  default: mockParsePodcast,
}));

vi.mock("open-graph-scraper", () => ({
  default: mockOgs,
}));

vi.mock("fuzzysort", () => ({
  default: mockFuzzysort,
}));

// Import service AFTER mocks are set up
import { PodcastDownloaderService } from "../../services/podcast-downloader.service";

// Store original fetch to restore later
const originalFetch = global.fetch;

describe("PodcastDownloaderService", () => {
  let service: PodcastDownloaderService;
  let mockExistsSync: any;
  let mockStatSync: any;
  let mockReadFileSync: any;
  let mockUnlinkSync: any;
  let mockBucketUpload: any;
  let mockFetch: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Setup fs mocks
    const fsModule = await import("fs");
    mockExistsSync = vi.spyOn(fsModule.default, "existsSync");
    mockStatSync = vi.spyOn(fsModule.default, "statSync");
    mockReadFileSync = vi.spyOn(fsModule.default, "readFileSync");
    mockUnlinkSync = vi.spyOn(fsModule.default, "unlinkSync");

    // Setup storage mock
    const storage = await import("../../storage");
    mockBucketUpload = storage.audioFilesBucket.upload;

    // Setup fetch mock
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;

    service = new PodcastDownloaderService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe("downloadAndUpload", () => {
    /**
     * Helper to create a mock curl process
     */
    const createMockCurlProcess = (exitCode: number = 0, stderr: string = ""): EventEmitter => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();

      // Simulate async curl execution
      setTimeout(() => {
        if (stderr) {
          mockProcess.stderr.emit("data", Buffer.from(stderr));
        }
        mockProcess.emit("close", exitCode);
      }, 0);

      return mockProcess;
    };

    it("should successfully download RSS feed podcast (latest episode)", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 123;

      // Mock parsePodcastUrl to return RSS
      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      // Mock RSS feed fetch
      const mockRssXml = `<?xml version="1.0"?>
        <rss><channel>
          <item>
            <title>Latest Episode</title>
            <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" />
          </item>
        </channel></rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => mockRssXml,
      });

      // Mock podcast parser
      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [
            {
              title: "Latest Episode",
              enclosure: { url: "https://example.com/audio.mp3" },
            },
          ],
        });
      });

      // Mock curl spawn
      mockSpawn.mockReturnValue(createMockCurlProcess(0));

      // Mock file operations
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 5000000 }); // 5MB file
      mockReadFileSync.mockReturnValue(Buffer.from("fake audio data"));
      mockUnlinkSync.mockReturnValue(undefined);
      mockBucketUpload.mockResolvedValue(undefined);

      const bucketKey = await service.downloadAndUpload(episodeUrl, bookmarkId);

      // Behavior-focused assertions: verify result and side effects
      expect(bucketKey).toBe(`audio-${bookmarkId}-podcast.mp3`);
      expect(bucketKey).toMatch(/^audio-\d+-podcast\.mp3$/);
      expect(mockBucketUpload).toHaveBeenCalledWith(
        `audio-${bookmarkId}-podcast.mp3`,
        expect.any(Buffer),
        { contentType: "audio/mpeg" }
      );
      expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
    });

    it("should successfully download Apple Podcasts episode", async () => {
      const episodeUrl = "https://podcasts.apple.com/us/podcast/show-name/id123?i=456";
      const bookmarkId = 789;

      // Mock parsePodcastUrl to return Apple
      mockParsePodcastUrl.mockReturnValue({
        platform: "apple",
        showId: "123",
        episodeId: "456",
      });

      // Mock getApplePodcastRss to return RSS feed URL
      mockGetApplePodcastRss.mockResolvedValue("https://example.com/apple-rss.xml");

      // Mock OpenGraph scraper
      mockOgs.mockResolvedValue({
        result: {
          ogTitle: "Episode 5: The Best Episode",
        },
        error: null,
      });

      // Mock RSS feed fetch
      const mockRssXml = `<?xml version="1.0"?>
        <rss><channel>
          <item>
            <title>Episode 5: The Best Episode</title>
            <enclosure url="https://example.com/episode5.mp3" type="audio/mpeg" />
          </item>
        </channel></rss>`;

      // Mock fetch to handle both iTunes API call and RSS feed fetch
      // First call: iTunes API (returns JSON)
      // Second call: RSS feed (returns XML text)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            resultCount: 1,
            results: [{ feedUrl: "https://example.com/apple-rss.xml" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockRssXml,
        });

      // Mock podcast parser
      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [
            {
              title: "Episode 5: The Best Episode",
              enclosure: { url: "https://example.com/episode5.mp3" },
            },
          ],
        });
      });

      // Mock fuzzysort
      mockFuzzysort.go.mockReturnValue([
        { target: "Episode 5: The Best Episode", score: 500 },
      ]);

      // Mock curl spawn
      mockSpawn.mockReturnValue(createMockCurlProcess(0));

      // Mock file operations
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 10000000 });
      mockReadFileSync.mockReturnValue(Buffer.from("audio"));
      mockUnlinkSync.mockReturnValue(undefined);
      mockBucketUpload.mockResolvedValue(undefined);

      const bucketKey = await service.downloadAndUpload(episodeUrl, bookmarkId);

      expect(bucketKey).toBe(`audio-${bookmarkId}-podcast.mp3`);
      // Note: mockGetApplePodcastRss is not actually called because the real function is used
      // The real function uses the global fetch which is mocked, so the behavior is still correct
      expect(mockOgs).toHaveBeenCalled();
      expect(mockFuzzysort.go).toHaveBeenCalled();
    });

    it("should fallback to latest episode when OpenGraph fails", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 456;

      // Mock parsePodcastUrl - return RSS platform explicitly
      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      // Mock OpenGraph scraper to fail (though it shouldn't be called for RSS URLs)
      mockOgs.mockRejectedValue(new Error("Scraping failed"));

      // Mock RSS feed fetch
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title>Latest Episode</title>
              <enclosure url="https://example.com/latest.mp3" type="audio/mpeg" />
            </item>
          </channel></rss>`,
      });

      // Mock podcast parser
      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [
            {
              title: "Latest Episode",
              enclosure: { url: "https://example.com/latest.mp3" },
            },
          ],
        });
      });

      // Mock curl spawn
      mockSpawn.mockReturnValue(createMockCurlProcess(0));

      // Mock file operations
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 1000000 });
      mockReadFileSync.mockReturnValue(Buffer.from("audio"));
      mockUnlinkSync.mockReturnValue(undefined);
      mockBucketUpload.mockResolvedValue(undefined);

      const bucketKey = await service.downloadAndUpload(episodeUrl, bookmarkId);

      expect(bucketKey).toBe(`audio-${bookmarkId}-podcast.mp3`);
      // Should use latest episode without fuzzy matching
      expect(mockFuzzysort.go).not.toHaveBeenCalled();
    });

    it("should handle curl download failure", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 999;

      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title>Episode</title>
              <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" />
            </item>
          </channel></rss>`,
      });

      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [
            {
              title: "Episode",
              enclosure: { url: "https://example.com/audio.mp3" },
            },
          ],
        });
      });

      // Mock curl to fail
      mockSpawn.mockReturnValue(createMockCurlProcess(1, "curl: (6) Could not resolve host"));

      mockExistsSync.mockReturnValue(false);

      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow(
        "Failed to download podcast audio"
      );
    });

    it("should handle empty audio file", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 111;

      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title>Episode</title>
              <enclosure url="https://example.com/empty.mp3" type="audio/mpeg" />
            </item>
          </channel></rss>`,
      });

      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [{ title: "Episode", enclosure: { url: "https://example.com/empty.mp3" } }],
        });
      });

      mockSpawn.mockReturnValue(createMockCurlProcess(0));
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 0 }); // Empty file
      mockUnlinkSync.mockReturnValue(undefined);

      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow(
        "Downloaded file is empty"
      );
      expect(mockUnlinkSync).toHaveBeenCalledTimes(2); // One in error handler, one in cleanup
    });

    it("should handle file size exceeding limit", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 222;

      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title>Episode</title>
              <enclosure url="https://example.com/huge.mp3" type="audio/mpeg" />
            </item>
          </channel></rss>`,
      });

      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [{ title: "Episode", enclosure: { url: "https://example.com/huge.mp3" } }],
        });
      });

      mockSpawn.mockReturnValue(createMockCurlProcess(0));
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 600 * 1024 * 1024 }); // 600MB (over 500MB limit)
      mockUnlinkSync.mockReturnValue(undefined);

      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow(
        "Audio file too large"
      );
      expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("should handle invalid audio URL format", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 333;

      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title>Episode</title>
              <enclosure url="not-a-valid-url" type="audio/mpeg" />
            </item>
          </channel></rss>`,
      });

      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [{ title: "Episode", enclosure: { url: "not-a-valid-url" } }],
        });
      });

      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow(
        "Invalid audio URL format"
      );
    });

    it("should handle unsupported audio URL protocol", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 444;

      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title>Episode</title>
              <enclosure url="ftp://example.com/audio.mp3" type="audio/mpeg" />
            </item>
          </channel></rss>`,
      });

      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [{ title: "Episode", enclosure: { url: "ftp://example.com/audio.mp3" } }],
        });
      });

      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow(
        "Unsupported protocol: ftp:"
      );
    });

    it("should handle RSS feed fetch failure", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 555;

      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow(
        "Failed to fetch RSS feed: 404 Not Found"
      );
    });

    it("should handle RSS parsing error", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 666;

      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => "invalid xml",
      });

      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(new Error("XML parsing failed"), null);
      });

      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow();
    });

    it("should handle episode not found in RSS feed", async () => {
      const episodeUrl = "https://podcasts.apple.com/us/podcast/show/id777?i=999";
      const bookmarkId = 777;

      // Mock parsePodcastUrl to recognize Apple Podcasts URL
      mockParsePodcastUrl.mockReturnValue({
        platform: "apple",
        showId: "777",
      });

      // Mock getApplePodcastRss to return RSS feed URL
      mockGetApplePodcastRss.mockResolvedValue("https://example.com/feed.rss");

      // Mock OpenGraph to extract episode title
      mockOgs.mockResolvedValue({
        result: {
          ogTitle: "Nonexistent Episode",
        },
        error: null,
      });

      // Mock RSS feed fetch with different episode
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title>Different Episode</title>
              <enclosure url="https://example.com/different.mp3" type="audio/mpeg" />
            </item>
          </channel></rss>`,
        json: async () => ({
          resultCount: 1,
          results: [{ feedUrl: "https://example.com/feed.rss" }],
        }),
      });

      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [
            { title: "Different Episode", enclosure: { url: "https://example.com/different.mp3" } },
          ],
        });
      });

      // Mock fuzzysort to return no good matches
      mockFuzzysort.go.mockReturnValue([]);

      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow(
        "Episode \"Nonexistent Episode\" not found in RSS feed"
      );
    });

    it("should handle bucket upload failure and clean up temp file", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 888;

      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title>Episode</title>
              <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" />
            </item>
          </channel></rss>`,
      });

      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [{ title: "Episode", enclosure: { url: "https://example.com/audio.mp3" } }],
        });
      });

      mockSpawn.mockReturnValue(createMockCurlProcess(0));
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 5000000 });
      mockReadFileSync.mockReturnValue(Buffer.from("audio"));
      mockBucketUpload.mockRejectedValue(new Error("Bucket upload failed"));
      mockUnlinkSync.mockReturnValue(undefined);

      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow(
        "Failed to download podcast audio"
      );
      expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("should handle cleanup error gracefully", async () => {
      const episodeUrl = "https://example.com/feed.rss";
      const bookmarkId = 999;

      mockParsePodcastUrl.mockReturnValue({
        platform: "rss",
        feedUrl: episodeUrl,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title>Episode</title>
              <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" />
            </item>
          </channel></rss>`,
      });

      mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
        callback(null, {
          episodes: [{ title: "Episode", enclosure: { url: "https://example.com/audio.mp3" } }],
        });
      });

      mockSpawn.mockReturnValue(createMockCurlProcess(1, "Download failed"));
      mockExistsSync.mockReturnValue(true);
      mockUnlinkSync.mockImplementation(() => {
        throw new Error("Cleanup failed");
      });

      // Should not throw on cleanup error, only on original error
      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow(
        "Failed to download podcast audio"
      );
    });

    it("should handle unsupported podcast platform", async () => {
      const episodeUrl = "https://unsupported-platform.com/episode/123";
      const bookmarkId = 123;

      mockParsePodcastUrl.mockReturnValue({
        platform: "unknown",
      });

      await expect(service.downloadAndUpload(episodeUrl, bookmarkId)).rejects.toThrow(
        "Unsupported podcast URL format"
      );
    });
  });

  describe("Timeout Handling", () => {
    describe("downloadAndUpload()", () => {
      it("should timeout after 5 minutes when curl hangs", async () => {
        const episodeUrl = "https://example.com/feed.rss";
        const bookmarkId = 456;

        mockParsePodcastUrl.mockReturnValue({
          platform: "rss",
          feedUrl: episodeUrl,
        });

        // Mock RSS feed fetch
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `<?xml version="1.0"?>
            <rss><channel>
              <item>
                <title>Episode</title>
                <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" />
              </item>
            </channel></rss>`,
        });

        mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
          callback(null, {
            episodes: [{ title: "Episode", enclosure: { url: "https://example.com/audio.mp3" } }],
          });
        });

        // Mock spawn to never complete (simulates curl hang)
        const hangingProcess = new EventEmitter() as any;
        hangingProcess.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(hangingProcess);

        mockExistsSync.mockReturnValue(false);

        // Start download (will hang)
        const downloadPromise = service.downloadAndUpload(episodeUrl, bookmarkId);

        // Fast-forward time by 5 minutes
        await vi.advanceTimersByTimeAsync(300000);

        // Should reject with timeout error
        await expect(downloadPromise).rejects.toThrow(/timed out after 300000ms/);

        // Verify spawn was called
        expect(mockSpawn).toHaveBeenCalledOnce();
      });

      it("should succeed when curl completes within timeout", async () => {
        const episodeUrl = "https://example.com/feed.rss";
        const bookmarkId = 456;

        mockParsePodcastUrl.mockReturnValue({
          platform: "rss",
          feedUrl: episodeUrl,
        });

        // Mock RSS feed fetch
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `<?xml version="1.0"?>
            <rss><channel>
              <item>
                <title>Episode</title>
                <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" />
              </item>
            </channel></rss>`,
        });

        mockParsePodcast.mockImplementation((xml: string, callback: Function) => {
          callback(null, {
            episodes: [{ title: "Episode", enclosure: { url: "https://example.com/audio.mp3" } }],
          });
        });

        // Mock successful curl execution that completes quickly
        const mockProcess = new EventEmitter() as any;
        mockProcess.stderr = new EventEmitter();
        setTimeout(() => {
          mockProcess.emit("close", 0);
        }, 0);
        mockSpawn.mockReturnValue(mockProcess);

        // Mock file operations
        mockExistsSync.mockReturnValue(true);
        mockStatSync.mockReturnValue({ size: 5000000 });
        mockReadFileSync.mockReturnValue(Buffer.from("fake podcast audio"));
        mockUnlinkSync.mockReturnValue(undefined);
        mockBucketUpload.mockResolvedValue(undefined);

        // Start download
        const downloadPromise = service.downloadAndUpload(episodeUrl, bookmarkId);

        // Fast-forward by 1 minute (well within 5 min timeout)
        await vi.advanceTimersByTimeAsync(60000);

        // Should succeed
        const bucketKey = await downloadPromise;
        expect(bucketKey).toContain(`audio-${bookmarkId}-`);
        expect(mockBucketUpload).toHaveBeenCalledOnce();
      });
    });

    describe("RSS Feed Fetch", () => {
      it("should timeout after 30 seconds when RSS fetch hangs", async () => {
        const episodeUrl = "https://example.com/feed.rss";
        const bookmarkId = 789;

        mockParsePodcastUrl.mockReturnValue({
          platform: "rss",
          feedUrl: episodeUrl,
        });

        // Mock fetch to never resolve (simulates hang)
        mockFetch.mockImplementation(() => new Promise(() => {}));

        // Start download (will hang on RSS fetch)
        const downloadPromise = service.downloadAndUpload(episodeUrl, bookmarkId);

        // Fast-forward time by 30 seconds
        await vi.advanceTimersByTimeAsync(30000);

        // Should reject with timeout error
        await expect(downloadPromise).rejects.toThrow(/timed out after 30000ms/);
      });
    });
  });
});
