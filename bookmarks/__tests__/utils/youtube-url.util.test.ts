/**
 * YouTube URL Utility Tests (Property-Based)
 *
 * Tests for youtube-url.util.ts utility functions.
 * Uses fast-check for property-based testing to generate hundreds of test cases.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  extractYouTubeVideoId,
  buildYouTubeUrl,
} from "../../utils/youtube-url.util";

describe("youtube-url.util (Property-Based)", () => {
  describe("extractYouTubeVideoId", () => {
    it("PROPERTY: Round-trip identity (build then extract = original)", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[A-Za-z0-9_-]+$/.test(s)),
          (videoId) => {
            const url = buildYouTubeUrl(videoId);
            const extracted = extractYouTubeVideoId(url);
            return extracted === videoId;
          }
        )
      );
    });

    it("PROPERTY: Extracts same ID from all valid URL formats", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 11, maxLength: 11 }).filter((s) => /^[A-Za-z0-9_-]+$/.test(s)),
          (videoId) => {
            const formats = [
              `https://youtube.com/watch?v=${videoId}`,
              `https://www.youtube.com/watch?v=${videoId}`,
              `https://youtu.be/${videoId}`,
              `https://m.youtube.com/watch?v=${videoId}`,
              `https://www.youtube.com/embed/${videoId}`,
            ];

            const extracted = formats.map(extractYouTubeVideoId);
            return extracted.every((id) => id === videoId);
          }
        )
      );
    });

    it("PROPERTY: Handles query parameters without affecting extraction", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 11, maxLength: 11 }).filter((s) => /^[A-Za-z0-9_-]+$/.test(s)),
          fc.integer({ min: 0, max: 10000 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[A-Za-z0-9]+$/.test(s)),
          (videoId, timestamp, playlist) => {
            const url = `https://youtube.com/watch?v=${videoId}&t=${timestamp}&list=${playlist}`;
            const extracted = extractYouTubeVideoId(url);
            return extracted === videoId;
          }
        )
      );
    });

    it("PROPERTY: Returns null for non-YouTube URLs", () => {
      fc.assert(
        fc.property(
          fc.webUrl().filter((url) => !url.includes("youtube") && !url.includes("youtu.be")),
          (invalidUrl) => {
            const extracted = extractYouTubeVideoId(invalidUrl);
            return extracted === null;
          }
        )
      );
    });

    it("PROPERTY: buildYouTubeUrl always produces valid YouTube URL", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[A-Za-z0-9_-]+$/.test(s)),
          (videoId) => {
            const url = buildYouTubeUrl(videoId);
            return (
              url.startsWith("https://www.youtube.com/watch?v=") && url.includes(videoId)
            );
          }
        )
      );
    });
  });

  describe("Edge Cases (Manual)", () => {
    it("should return null for empty string", () => {
      expect(extractYouTubeVideoId("")).toBeNull();
    });

    it("should return null for YouTube URL without video ID", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com")).toBeNull();
    });

    it("should handle URLs without protocol", () => {
      expect(extractYouTubeVideoId("youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });
  });
});
