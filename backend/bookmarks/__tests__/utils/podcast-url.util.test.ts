/**
 * Podcast URL Utility Tests
 *
 * Tests for podcast-url.util.ts utility functions.
 * Tests podcast URL parsing and RSS feed resolution.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parsePodcastUrl,
  getApplePodcastRss,
} from "../../utils/podcast-url.util";

// Store original fetch to restore later
const originalFetch = global.fetch;

describe("podcast-url.util", () => {
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
    it("should parse Apple Podcasts URL and extract show ID", () => {
      const url = "https://podcasts.apple.com/us/podcast/my-show/id123456789";
      const info = parsePodcastUrl(url);

      expect(info.platform).toBe("apple");
      expect(info.showId).toBe("123456789");
    });

    it("should parse Apple Podcasts URL with episode parameter", () => {
      const url = "https://podcasts.apple.com/us/podcast/my-show/id123456?i=1000567890";
      const info = parsePodcastUrl(url);

      expect(info.platform).toBe("apple");
      expect(info.showId).toBe("123456");
    });

    it("should parse Google Podcasts URL and decode base64 feed", () => {
      // Base64 encode "https://example.com/feed"
      const encodedFeed = Buffer.from("https://example.com/feed").toString("base64");
      const url = `https://podcasts.google.com/feed/${encodedFeed}`;

      const info = parsePodcastUrl(url);

      expect(info.platform).toBe("google");
      expect(info.feedUrl).toBe("https://example.com/feed");
    });

    it("should throw error for invalid Google Podcasts base64", () => {
      const url = "https://podcasts.google.com/feed/invalid-base64!!!";

      expect(() => parsePodcastUrl(url)).toThrow(/Invalid Google Podcasts URL format/);
    });

    it("should throw error for Google Podcasts with non-URL decoded value", () => {
      // Base64 encode "not-a-url"
      const encodedNonUrl = Buffer.from("not-a-url").toString("base64");
      const url = `https://podcasts.google.com/feed/${encodedNonUrl}`;

      expect(() => parsePodcastUrl(url)).toThrow(/Invalid Google Podcasts URL format/);
    });

    it("should detect direct RSS feed URL with .xml extension", () => {
      const url = "https://feeds.example.com/podcast.xml";
      const info = parsePodcastUrl(url);

      expect(info.platform).toBe("rss");
      expect(info.feedUrl).toBe(url);
    });

    it("should detect RSS feed URL with /feed/ path", () => {
      const url = "https://example.com/feed/podcast";
      const info = parsePodcastUrl(url);

      expect(info.platform).toBe("rss");
      expect(info.feedUrl).toBe(url);
    });

    it("should detect RSS feed URL with /rss/ path", () => {
      const url = "https://example.com/rss/my-show";
      const info = parsePodcastUrl(url);

      expect(info.platform).toBe("rss");
      expect(info.feedUrl).toBe(url);
    });

    it("should return unknown for unrecognized URL format", () => {
      const url = "https://example.com/some-page";
      const info = parsePodcastUrl(url);

      expect(info.platform).toBe("unknown");
      expect(info.showId).toBeUndefined();
      expect(info.feedUrl).toBeUndefined();
    });
  });

  describe("getApplePodcastRss", () => {
    it("should fetch RSS feed URL from iTunes API", async () => {
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
});
