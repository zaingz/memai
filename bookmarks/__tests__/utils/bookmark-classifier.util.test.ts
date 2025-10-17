/**
 * Bookmark Classifier Utility Tests (Property-Based)
 *
 * Tests for bookmark-classifier.util.ts utility functions.
 * Uses fast-check for property-based testing to ensure classification consistency.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { classifyBookmarkUrl } from "../../utils/bookmark-classifier.util";
import { BookmarkSource } from "../../types";

describe("bookmark-classifier.util (Property-Based)", () => {
  describe("classifyBookmarkUrl", () => {
    it("PROPERTY: Total function (every URL maps to exactly one source)", () => {
      fc.assert(
        fc.property(fc.webUrl(), (url) => {
          const source = classifyBookmarkUrl(url);
          const validSources = Object.values(BookmarkSource);
          return validSources.includes(source);
        })
      );
    });

    it("PROPERTY: Determinism (same URL always produces same classification)", () => {
      fc.assert(
        fc.property(fc.webUrl(), (url) => {
          const source1 = classifyBookmarkUrl(url);
          const source2 = classifyBookmarkUrl(url);
          return source1 === source2;
        })
      );
    });

    it("PROPERTY: YouTube patterns always classify as YOUTUBE", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 11, maxLength: 11 }).filter((s) => /^[A-Za-z0-9_-]+$/.test(s)),
          (videoId) => {
            const patterns = [
              `https://youtube.com/watch?v=${videoId}`,
              `https://www.youtube.com/watch?v=${videoId}`,
              `https://youtu.be/${videoId}`,
              `https://m.youtube.com/watch?v=${videoId}`,
              `https://www.youtube.com/embed/${videoId}`,
            ];

            return patterns.every(
              (url) => classifyBookmarkUrl(url) === BookmarkSource.YOUTUBE
            );
          }
        )
      );
    });

    it("PROPERTY: Podcast patterns always classify as PODCAST", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant("https://podcasts.apple.com/us/podcast/test/id123456"),
            fc.constant("https://feeds.example.com/podcast.xml"),
            fc.constant("https://example.com/feed/podcast"),
            fc.constant("https://example.com/rss/show"),
            fc.constant("https://podcasts.google.com/feed/aHR0cHM6Ly9leGFtcGxlLmNvbS9mZWVk")
          ),
          (podcastUrl) => {
            return classifyBookmarkUrl(podcastUrl) === BookmarkSource.PODCAST;
          }
        )
      );
    });

    it("PROPERTY: Social media patterns classify to correct source", () => {
      const testCases = [
        { pattern: "https://reddit.com/r/test/comments/abc123", expected: BookmarkSource.REDDIT },
        { pattern: "https://redd.it/abc123", expected: BookmarkSource.REDDIT },
        { pattern: "https://twitter.com/user/status/123", expected: BookmarkSource.TWITTER },
        { pattern: "https://x.com/user/status/123", expected: BookmarkSource.TWITTER },
        { pattern: "https://linkedin.com/posts/user_activity-123", expected: BookmarkSource.LINKEDIN },
        { pattern: "https://linkedin.com/pulse/article", expected: BookmarkSource.LINKEDIN },
      ];

      testCases.forEach(({ pattern, expected }) => {
        expect(classifyBookmarkUrl(pattern)).toBe(expected);
      });
    });

    it("PROPERTY: Blog platforms classify as BLOG", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant("https://medium.com/@author/article"),
            fc.constant("https://newsletter.substack.com/p/article"),
            fc.constant("https://myblog.wordpress.com/2025/01/article"),
            fc.constant("https://myblog.blogspot.com/2025/01/article.html"),
            fc.constant("https://myblog.ghost.io/article"),
            fc.constant("https://company.com/blog/article"),
            fc.constant("https://news.example.com/article/story")
          ),
          (blogUrl) => {
            return classifyBookmarkUrl(blogUrl) === BookmarkSource.BLOG;
          }
        )
      );
    });
  });

  describe("Specific Classification Tests", () => {
    it("should classify standard YouTube watch URL as YOUTUBE", () => {
      expect(classifyBookmarkUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        BookmarkSource.YOUTUBE
      );
    });

    it("should classify Apple Podcasts URL as PODCAST", () => {
      expect(classifyBookmarkUrl("https://podcasts.apple.com/us/podcast/test/id123456")).toBe(
        BookmarkSource.PODCAST
      );
    });

    it("should classify Reddit post URL as REDDIT", () => {
      expect(
        classifyBookmarkUrl("https://www.reddit.com/r/programming/comments/abc123/test")
      ).toBe(BookmarkSource.REDDIT);
    });

    it("should classify Twitter URL as TWITTER", () => {
      expect(classifyBookmarkUrl("https://twitter.com/user/status/123456")).toBe(
        BookmarkSource.TWITTER
      );
    });

    it("should classify X.com URL as TWITTER", () => {
      expect(classifyBookmarkUrl("https://x.com/user/status/123456")).toBe(BookmarkSource.TWITTER);
    });

    it("should classify LinkedIn post as LINKEDIN", () => {
      expect(classifyBookmarkUrl("https://www.linkedin.com/posts/user_activity-123456")).toBe(
        BookmarkSource.LINKEDIN
      );
    });

    it("should classify Medium article as BLOG", () => {
      expect(classifyBookmarkUrl("https://medium.com/@author/article-title")).toBe(
        BookmarkSource.BLOG
      );
    });

    it("should classify generic URL as WEB", () => {
      expect(classifyBookmarkUrl("https://example.com/page")).toBe(BookmarkSource.WEB);
    });

    it("should classify GitHub URL as WEB", () => {
      expect(classifyBookmarkUrl("https://github.com/user/repo")).toBe(BookmarkSource.WEB);
    });
  });
});
