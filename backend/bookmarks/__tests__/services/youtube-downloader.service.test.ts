/**
 * YouTube Downloader Service Tests
 *
 * Unit tests for YouTubeDownloaderService with mocked file system and child process.
 * Tests YouTube audio download and upload to Encore bucket.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";

// Use vi.hoisted() to ensure mockExec is available before vi.mock() is executed
const mockExec = vi.hoisted(() => vi.fn());

// Mock modules before imports
vi.mock("util", () => ({
  promisify: () => mockExec, // Return the hoisted mock exec function
}));
vi.mock("child_process");
vi.mock("fs");
vi.mock("../../storage", () => ({
  audioFilesBucket: {
    upload: vi.fn(),
    download: vi.fn(),
    remove: vi.fn(),
  },
}));

// Import service AFTER mocks are set up
import { YouTubeDownloaderService } from "../../services/youtube-downloader.service";

describe("YouTubeDownloaderService", () => {
  let service: YouTubeDownloaderService;
  let mockReadFileSync: any;
  let mockStatSync: any;
  let mockUnlinkSync: any;
  let mockExistsSync: any;
  let mockBucketUpload: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked functions
    const fsModule = await import("fs");
    const storage = await import("../../storage");

    mockReadFileSync = vi.spyOn(fsModule.default, "readFileSync");
    mockStatSync = vi.spyOn(fsModule.default, "statSync");
    mockUnlinkSync = vi.spyOn(fsModule.default, "unlinkSync");
    mockExistsSync = vi.spyOn(fsModule.default, "existsSync");

    mockBucketUpload = storage.audioFilesBucket.upload;

    service = new YouTubeDownloaderService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("downloadAndUpload", () => {
    it("should successfully download and upload audio", async () => {
      const videoId = "dQw4w9WgXcQ";
      const bookmarkId = 123;
      const expectedBucketKey = `audio-${bookmarkId}-${videoId}.mp3`;

      // Mock yt-dlp exec success - returns a promise
      mockExec.mockResolvedValue({ stdout: "Download complete", stderr: "" });

      // Mock file operations
      mockStatSync.mockReturnValue({ size: 5000000 }); // 5MB file
      mockReadFileSync.mockReturnValue(Buffer.from("fake audio data"));
      mockUnlinkSync.mockReturnValue(undefined);
      mockBucketUpload.mockResolvedValue(undefined);

      const bucketKey = await service.downloadAndUpload(videoId, bookmarkId);

      expect(bucketKey).toBe(expectedBucketKey);
      expect(mockExec).toHaveBeenCalledTimes(1);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("yt-dlp")
      );
      expect(mockBucketUpload).toHaveBeenCalledWith(
        expectedBucketKey,
        expect.any(Buffer),
        { contentType: "audio/mpeg" }
      );
      expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
    });

    it("should clean up temp file after successful upload", async () => {
      mockExec.mockResolvedValue({ stdout: "Success", stderr: "" });

      mockStatSync.mockReturnValue({ size: 1000000 });
      mockReadFileSync.mockReturnValue(Buffer.from("audio"));
      mockUnlinkSync.mockReturnValue(undefined);
      mockBucketUpload.mockResolvedValue(undefined);

      await service.downloadAndUpload("videoId", 456);

      expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
      expect(mockUnlinkSync).toHaveBeenCalledWith(
        expect.stringContaining("videoId")
      );
    });

    it("should handle yt-dlp download errors", async () => {
      mockExec.mockRejectedValue(new Error("Video not found"));

      mockExistsSync.mockReturnValue(false);

      await expect(
        service.downloadAndUpload("invalid-id", 789)
      ).rejects.toThrow("Failed to download YouTube audio");
    });

    it("should handle bucket upload errors", async () => {
      mockExec.mockResolvedValue({ stdout: "Success", stderr: "" });

      mockStatSync.mockReturnValue({ size: 1000000 });
      mockReadFileSync.mockReturnValue(Buffer.from("audio"));
      mockBucketUpload.mockRejectedValue(new Error("Bucket full"));
      mockExistsSync.mockReturnValue(true);
      mockUnlinkSync.mockReturnValue(undefined);

      await expect(
        service.downloadAndUpload("videoId", 999)
      ).rejects.toThrow("Failed to download YouTube audio");

      // Should still attempt cleanup
      expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("should clean up temp file even on error", async () => {
      mockExec.mockRejectedValue(new Error("Download failed"));

      mockExistsSync.mockReturnValue(true);
      mockUnlinkSync.mockReturnValue(undefined);

      await expect(
        service.downloadAndUpload("videoId", 111)
      ).rejects.toThrow();

      expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
    });

    it("should handle cleanup errors gracefully", async () => {
      mockExec.mockRejectedValue(new Error("Download failed"));

      mockExistsSync.mockReturnValue(true);
      mockUnlinkSync.mockImplementation(() => {
        throw new Error("Cleanup failed");
      });

      // Should not throw on cleanup error, only on original error
      await expect(
        service.downloadAndUpload("videoId", 222)
      ).rejects.toThrow("Failed to download YouTube audio: Download failed");
    });

    it("should validate bucket key format", async () => {
      mockExec.mockResolvedValue({ stdout: "Success", stderr: "" });

      mockStatSync.mockReturnValue({ size: 1000000 });
      mockReadFileSync.mockReturnValue(Buffer.from("audio"));
      mockUnlinkSync.mockReturnValue(undefined);
      mockBucketUpload.mockResolvedValue(undefined);

      const videoId = "abc123XYZ";
      const bookmarkId = 456;

      const bucketKey = await service.downloadAndUpload(videoId, bookmarkId);

      expect(bucketKey).toMatch(/^audio-\d+-[a-zA-Z0-9]+\.mp3$/);
      expect(bucketKey).toBe(`audio-${bookmarkId}-${videoId}.mp3`);
    });

    it("should handle yt-dlp stderr warnings without failing", async () => {
      mockExec.mockResolvedValue({
        stdout: "Download complete",
        stderr: "WARNING: Some warning message\nDeleting original file",
      });

      mockStatSync.mockReturnValue({ size: 1000000 });
      mockReadFileSync.mockReturnValue(Buffer.from("audio"));
      mockUnlinkSync.mockReturnValue(undefined);
      mockBucketUpload.mockResolvedValue(undefined);

      const bucketKey = await service.downloadAndUpload("videoId", 789);

      expect(bucketKey).toBeDefined();
      expect(mockBucketUpload).toHaveBeenCalled();
    });

    it("should pass correct yt-dlp arguments", async () => {
      mockExec.mockResolvedValue({ stdout: "Success", stderr: "" });

      mockStatSync.mockReturnValue({ size: 1000000 });
      mockReadFileSync.mockReturnValue(Buffer.from("audio"));
      mockUnlinkSync.mockReturnValue(undefined);
      mockBucketUpload.mockResolvedValue(undefined);

      await service.downloadAndUpload("testVideo", 123);

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("yt-dlp -x")
      );
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("--audio-format")
      );
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("https://www.youtube.com/watch?v=testVideo")
      );
    });

    it("should upload buffer with correct content type", async () => {
      mockExec.mockResolvedValue({ stdout: "Success", stderr: "" });

      const audioData = Buffer.from("test audio content");
      mockStatSync.mockReturnValue({ size: audioData.length });
      mockReadFileSync.mockReturnValue(audioData);
      mockUnlinkSync.mockReturnValue(undefined);
      mockBucketUpload.mockResolvedValue(undefined);

      await service.downloadAndUpload("videoId", 999);

      expect(mockBucketUpload).toHaveBeenCalledWith(
        expect.any(String),
        audioData,
        { contentType: "audio/mpeg" }
      );
    });
  });
});
