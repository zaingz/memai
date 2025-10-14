/**
 * Bookmark Classifier Utility Tests
 *
 * Tests for bookmark-classifier.util.ts utility functions.
 * Tests URL classification logic for different source types.
 */

import { describe, it, expect } from "vitest";
import { classifyBookmarkUrl } from "../../utils/bookmark-classifier.util";
import { BookmarkSource } from "../../types";

describe("bookmark-classifier.util", () => {
  describe("classifyBookmarkUrl", () => {
    // YouTube Tests
    it("should classify standard YouTube watch URL as YOUTUBE", () => {
      const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.YOUTUBE);
    });

    it("should classify YouTube short URL as YOUTUBE", () => {
      const url = "https://youtu.be/dQw4w9WgXcQ";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.YOUTUBE);
    });

    it("should classify YouTube embed URL as YOUTUBE", () => {
      const url = "https://www.youtube.com/embed/dQw4w9WgXcQ";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.YOUTUBE);
    });

    // Podcast Tests
    it("should classify Apple Podcasts URL as PODCAST", () => {
      const url = "https://podcasts.apple.com/us/podcast/test/id123456";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.PODCAST);
    });

    it("should classify RSS feed URL as PODCAST", () => {
      const url = "https://feeds.example.com/podcast.xml";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.PODCAST);
    });

    it("should classify direct RSS feed path as PODCAST", () => {
      const url = "https://example.com/feed/podcast";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.PODCAST);
    });

    it("should classify RSS path with /rss/ as PODCAST", () => {
      const url = "https://example.com/rss/show";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.PODCAST);
    });

    it("should classify Google Podcasts URL as PODCAST", () => {
      const url = "https://podcasts.google.com/feed/aHR0cHM6Ly9leGFtcGxlLmNvbS9mZWVk";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.PODCAST);
    });

    // Reddit Tests
    it("should classify Reddit post URL as REDDIT", () => {
      const url = "https://www.reddit.com/r/programming/comments/abc123/test";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.REDDIT);
    });

    it("should classify short Reddit URL as REDDIT", () => {
      const url = "https://redd.it/abc123";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.REDDIT);
    });

    // Twitter/X Tests
    it("should classify Twitter URL as TWITTER", () => {
      const url = "https://twitter.com/user/status/123456";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.TWITTER);
    });

    it("should classify X.com URL as TWITTER", () => {
      const url = "https://x.com/user/status/123456";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.TWITTER);
    });

    // LinkedIn Tests
    it("should classify LinkedIn post as LINKEDIN", () => {
      const url = "https://www.linkedin.com/posts/user_activity-123456";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.LINKEDIN);
    });

    it("should classify LinkedIn article as LINKEDIN", () => {
      const url = "https://www.linkedin.com/pulse/article-title";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.LINKEDIN);
    });

    // Blog Platform Tests
    it("should classify Medium article as BLOG", () => {
      const url = "https://medium.com/@author/article-title";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.BLOG);
    });

    it("should classify Substack article as BLOG", () => {
      const url = "https://newsletter.substack.com/p/article-title";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.BLOG);
    });

    it("should classify WordPress blog as BLOG", () => {
      const url = "https://myblog.wordpress.com/2025/01/article";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.BLOG);
    });

    it("should classify Blogspot URL as BLOG", () => {
      const url = "https://myblog.blogspot.com/2025/01/article.html";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.BLOG);
    });

    it("should classify Ghost.io blog as BLOG", () => {
      const url = "https://myblog.ghost.io/article-title";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.BLOG);
    });

    it("should classify URL with /blog/ path as BLOG", () => {
      const url = "https://company.com/blog/article-title";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.BLOG);
    });

    it("should classify URL with /article/ path as BLOG", () => {
      const url = "https://news.example.com/article/story-title";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.BLOG);
    });

    // Web/Default Tests
    it("should classify generic URL as WEB", () => {
      const url = "https://example.com/page";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.WEB);
    });

    it("should classify documentation URL as WEB", () => {
      const url = "https://docs.example.com/guide";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.WEB);
    });

    it("should classify GitHub URL as WEB", () => {
      const url = "https://github.com/user/repo";
      const source = classifyBookmarkUrl(url);

      expect(source).toBe(BookmarkSource.WEB);
    });
  });
});
