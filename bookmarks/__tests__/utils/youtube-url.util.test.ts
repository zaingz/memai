/**
 * YouTube URL Utility Tests
 *
 * Tests for youtube-url.util.ts utility functions.
 * These are pure function tests with no external dependencies.
 */

import { describe, it, expect } from "vitest";
import {
  extractYouTubeVideoId,
  buildYouTubeUrl,
} from "../../utils/youtube-url.util";

describe("youtube-url.util", () => {
  describe("extractYouTubeVideoId", () => {
    it("should extract video ID from standard watch URL", () => {
      const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const videoId = extractYouTubeVideoId(url);

      expect(videoId).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from watch URL with additional query params", () => {
      const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLtest";
      const videoId = extractYouTubeVideoId(url);

      expect(videoId).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from youtu.be short URL", () => {
      const url = "https://youtu.be/dQw4w9WgXcQ";
      const videoId = extractYouTubeVideoId(url);

      expect(videoId).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from youtu.be URL with query params", () => {
      const url = "https://youtu.be/dQw4w9WgXcQ?t=42";
      const videoId = extractYouTubeVideoId(url);

      expect(videoId).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from embed URL", () => {
      const url = "https://www.youtube.com/embed/dQw4w9WgXcQ";
      const videoId = extractYouTubeVideoId(url);

      expect(videoId).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from mobile URL", () => {
      const url = "https://m.youtube.com/watch?v=dQw4w9WgXcQ";
      const videoId = extractYouTubeVideoId(url);

      expect(videoId).toBe("dQw4w9WgXcQ");
    });

    it("should return null for invalid YouTube URL", () => {
      const url = "https://example.com/video";
      const videoId = extractYouTubeVideoId(url);

      expect(videoId).toBeNull();
    });

    it("should return null for YouTube URL without video ID", () => {
      const url = "https://www.youtube.com";
      const videoId = extractYouTubeVideoId(url);

      expect(videoId).toBeNull();
    });

    it("should return null for empty string", () => {
      const url = "";
      const videoId = extractYouTubeVideoId(url);

      expect(videoId).toBeNull();
    });

    it("should handle URLs without protocol", () => {
      const url = "youtube.com/watch?v=dQw4w9WgXcQ";
      const videoId = extractYouTubeVideoId(url);

      expect(videoId).toBe("dQw4w9WgXcQ");
    });
  });

  describe("buildYouTubeUrl", () => {
    it("should build standard YouTube watch URL from video ID", () => {
      const videoId = "dQw4w9WgXcQ";
      const url = buildYouTubeUrl(videoId);

      expect(url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    });

    it("should build URL for single character video ID", () => {
      const videoId = "a";
      const url = buildYouTubeUrl(videoId);

      expect(url).toBe("https://www.youtube.com/watch?v=a");
    });

    it("should build URL for alphanumeric video ID with special chars", () => {
      const videoId = "a1-B2_c3";
      const url = buildYouTubeUrl(videoId);

      expect(url).toBe("https://www.youtube.com/watch?v=a1-B2_c3");
    });
  });
});
