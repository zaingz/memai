/**
 * Podcast URL Utility Tests (Property-Based)
 *
 * Tests for podcast-url.util.ts utility functions.
 * Uses fast-check for property-based testing of podcast URL parsing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import {
  parsePodcastUrl,
  getApplePodcastRss,
} from "../../utils/podcast-url.util";

// Store original fetch to restore later
const originalFetch = global.fetch;

describe("podcast-url.util (Property-Based)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe("parsePodcastUrl", () => {
    it("PROPERTY: Google Podcasts base64 round-trip identity", () => {
      fc.assert(
        fc.property(
          fc.webUrl().filter((url) => url.startsWith("http")),
          (feedUrl) => {
            // Encode as Google Podcasts URL
            const encodedFeed = Buffer.from(feedUrl).toString("base64");
            const googlePodcastsUrl = `https://podcasts.google.com/feed/${encodedFeed}`;

            // Parse it
            const info = parsePodcastUrl(googlePodcastsUrl);

            // Should extract original URL
            return info.platform === "google" && info.feedUrl === feedUrl;
          }
        )
      );
    });

    it("PROPERTY: Apple Podcasts ID extraction is deterministic", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100000000, max: 999999999 }).map(String),
          (showId) => {
            const url = `https://podcasts.apple.com/us/podcast/my-show/id${showId}`;
            const info1 = parsePodcastUrl(url);
            const info2 = parsePodcastUrl(url);

            return (
              info1.platform === "apple" &&
              info1.showId === showId &&
              info2.platform === "apple" &&
              info2.showId === showId &&
              info1.showId === info2.showId
            );
          }
        )
      );
    });

    it("PROPERTY: RSS feed URLs are preserved exactly", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.webUrl().map((url) => `${url}.xml`),
            fc.webUrl().map((url) => `${url}/feed/podcast`),
            fc.webUrl().map((url) => `${url}/rss/show`)
          ),
          (rssUrl) => {
            const info = parsePodcastUrl(rssUrl);
            return info.platform === "rss" && info.feedUrl === rssUrl;
          }
        )
      );
    });

    it("PROPERTY: Unknown URLs always return unknown platform", () => {
      fc.assert(
        fc.property(
          fc
            .webUrl()
            .filter(
              (url) =>
                !url.includes("podcasts.apple.com") &&
                !url.includes("podcasts.google.com") &&
                !url.includes(".xml") &&
                !url.includes("/feed/") &&
                !url.includes("/rss/")
            ),
          (unknownUrl) => {
            const info = parsePodcastUrl(unknownUrl);
            return info.platform === "unknown";
          }
        )
      );
    });

    it("PROPERTY: Invalid base64 in Google Podcasts URL throws error", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => {
            try {
              Buffer.from(s, "base64").toString();
              return false; // Valid base64, skip
            } catch {
              return true; // Invalid base64, use it
            }
          }),
          (invalidBase64) => {
            const url = `https://podcasts.google.com/feed/${invalidBase64}`;
            try {
              parsePodcastUrl(url);
              return false; // Should have thrown
            } catch (error: any) {
              return error.message.includes("Invalid Google Podcasts URL format");
            }
          }
        )
      );
    });
  });

  describe("getApplePodcastRss", () => {
    it("PROPERTY: Valid iTunes API response returns feedUrl", async () => {
      const mockResponse = {
        resultCount: 1,
        results: [
          {
            feedUrl: "https://feeds.example.com/podcast.xml",
            collectionName: "My Podcast",
            artistName: "John Doe",
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const feedUrl = await getApplePodcastRss("123456789");

      expect(feedUrl).toBe("https://feeds.example.com/podcast.xml");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://itunes.apple.com/lookup?id=123456789&entity=podcast"
      );
    });

    it("should throw error when iTunes API returns non-200 status", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(getApplePodcastRss("123456789")).rejects.toThrow(
        "iTunes API error: 404 Not Found"
      );
    });

    it("should throw error when no results found", async () => {
      const mockResponse = {
        resultCount: 0,
        results: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(getApplePodcastRss("999999999")).rejects.toThrow(
        "No podcast found for Apple Podcasts ID: 999999999"
      );
    });

    it("should throw error when feedUrl is missing from results", async () => {
      const mockResponse = {
        resultCount: 1,
        results: [
          {
            collectionName: "My Podcast",
            artistName: "John Doe",
            // feedUrl missing
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(getApplePodcastRss("123456789")).rejects.toThrow(
        "RSS feed not found for this Apple Podcast"
      );
    });

    it("should handle iTunes API network errors", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      await expect(getApplePodcastRss("123456789")).rejects.toThrow("Network error");
    });
  });

  describe("Edge Cases (Manual)", () => {
    it("should parse Apple Podcasts URL with episode parameter", () => {
      const url = "https://podcasts.apple.com/us/podcast/my-show/id123456?i=1000567890";
      const info = parsePodcastUrl(url);

      expect(info.platform).toBe("apple");
      expect(info.showId).toBe("123456");
    });

    it("should detect direct RSS feed URL with .xml extension", () => {
      const url = "https://feeds.example.com/podcast.xml";
      const info = parsePodcastUrl(url);

      expect(info.platform).toBe("rss");
      expect(info.feedUrl).toBe(url);
    });

    it("should throw error for Google Podcasts with non-URL decoded value", () => {
      const encodedNonUrl = Buffer.from("not-a-url").toString("base64");
      const url = `https://podcasts.google.com/feed/${encodedNonUrl}`;

      expect(() => parsePodcastUrl(url)).toThrow(/Invalid Google Podcasts URL format/);
    });
  });
});
