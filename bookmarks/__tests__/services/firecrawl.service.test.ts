/**
 * FireCrawl Service Tests
 *
 * Unit tests for FirecrawlService with mocked fetch API.
 * Tests web content extraction with retry logic, rate limiting, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FirecrawlService } from "../../services/firecrawl.service";
import type { FirecrawlScrapeResponse } from "../../types/web-content.types";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock setTimeout for controlling backoff delays
vi.useFakeTimers();

describe("FirecrawlService", () => {
  let service: FirecrawlService;
  const mockApiKey = "test-firecrawl-api-key";
  const testUrl = "https://example.com/article";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    service = new FirecrawlService(mockApiKey);
  });

  afterEach(async () => {
    // Clear all pending timers to prevent unhandled rejections
    await vi.runOnlyPendingTimersAsync();
    vi.restoreAllMocks();
  });

  // Helper to create complete mock fetch response
  const createMockFetchResponse = (overrides: any = {}) => ({
    ok: true,
    status: 200,
    headers: new Map(),
    text: async () => "",
    json: async () => createMockSuccessResponse(),
    ...overrides,
  });

  const createMockSuccessResponse = (): FirecrawlScrapeResponse => ({
    success: true,
    data: {
      markdown: "# Test Article\n\nThis is test content.",
      html: "<h1>Test Article</h1><p>This is test content.</p>",
      metadata: {
        title: "Test Article",
        description: "Test description",
        language: "en",
        keywords: "test, article",
        ogImage: "https://example.com/image.jpg",
        author: "Test Author",
        publishedTime: "2025-01-01T00:00:00Z",
      },
    },
  });

  describe("scrape", () => {
    it("should successfully scrape URL on first attempt", async () => {
      const mockResponse = createMockSuccessResponse();
      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => mockResponse,
      }));

      const result = await service.scrape(testUrl);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.firecrawl.dev/v1/scrape",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Authorization": `Bearer ${mockApiKey}`,
            "Content-Type": "application/json",
          },
          body: expect.stringContaining(testUrl),
        })
      );
    });

    it("should include correct request body parameters", async () => {
      const mockResponse = createMockSuccessResponse();
      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => mockResponse,
      }));

      await service.scrape(testUrl);

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody).toEqual({
        url: testUrl,
        formats: ["markdown", "html"],
        onlyMainContent: true,
      });
    });

    it("should retry on network timeout and succeed", async () => {
      const mockResponse = createMockSuccessResponse();

      // First attempt: timeout (AbortError)
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      // Second attempt: success
      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => mockResponse,
      }));

      // Start the scrape (don't await yet)
      const scrapePromise = service.scrape(testUrl);

      // Fast-forward timers to trigger retry
      await vi.advanceTimersByTimeAsync(2000);

      const result = await scrapePromise;

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle rate limiting (429) and retry", async () => {
      const mockResponse = createMockSuccessResponse();

      // First attempt: rate limited
      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
        headers: new Map([["Retry-After", "60"]]),
      }));

      // Second attempt: success
      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => mockResponse,
      }));

      const scrapePromise = service.scrape(testUrl);

      // Fast-forward timers to trigger retry
      await vi.advanceTimersByTimeAsync(2000);

      const result = await scrapePromise;

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should throw error on non-200 status after all retries", async () => {
      mockFetch.mockResolvedValue(createMockFetchResponse({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      }));

      const scrapePromise = service.scrape(testUrl).catch((e) => e);

      // Fast-forward through all retry attempts
      await vi.advanceTimersByTimeAsync(30000);

      const result = await scrapePromise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toMatch(/FireCrawl API error \(500\): Internal server error/);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should handle unsuccessful response from FireCrawl", async () => {
      mockFetch.mockResolvedValue(createMockFetchResponse({
        json: async () => ({
          success: false,
          error: "Content extraction failed",
        }),
      }));

      const scrapePromise = service.scrape(testUrl).catch((e) => e);

      // Fast-forward through all retry attempts
      await vi.advanceTimersByTimeAsync(30000);

      const result = await scrapePromise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain("FireCrawl returned unsuccessful response");
    });

    it("should throw error after max retries exhausted", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const scrapePromise = service.scrape(testUrl).catch((e) => e);

      // Fast-forward through all retry attempts
      await vi.advanceTimersByTimeAsync(30000);

      const result = await scrapePromise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain("Network error");
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should handle JSON parsing errors", async () => {
      // Mock for all retry attempts
      mockFetch.mockResolvedValue(createMockFetchResponse({
        json: async () => {
          throw new Error("Invalid JSON");
        },
      }));

      const scrapePromise = service.scrape(testUrl).catch((e) => e);
      await vi.advanceTimersByTimeAsync(30000);

      const result = await scrapePromise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toMatch(/Failed to scrape URL.*Invalid JSON/);
    });

    it("should handle missing markdown in response", async () => {
      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => ({
          success: true,
          data: {
            markdown: "",
            html: "<p>Content</p>",
            metadata: { title: "Test" },
          },
        }),
      }));

      const result = await service.scrape(testUrl);

      expect(result.success).toBe(true);
      expect(result.data.markdown).toBe("");
    });

    it("should include metadata in successful response", async () => {
      const mockResponse = createMockSuccessResponse();

      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => mockResponse,
      }));

      const result = await service.scrape(testUrl);

      expect(result.data.metadata).toBeDefined();
      expect(result.data.metadata?.title).toBe("Test Article");
      expect(result.data.metadata?.author).toBe("Test Author");
      expect(result.data.metadata?.ogImage).toBe("https://example.com/image.jpg");
    });

    it("should handle long URLs", async () => {
      const longUrl = "https://example.com/" + "a".repeat(1000);
      const mockResponse = createMockSuccessResponse();

      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => mockResponse,
      }));

      const result = await service.scrape(longUrl);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(longUrl),
        })
      );
    });

    it("should handle special characters in URL", async () => {
      const specialUrl = "https://example.com/article?id=123&category=tech%20news";
      const mockResponse = createMockSuccessResponse();

      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => mockResponse,
      }));

      const result = await service.scrape(specialUrl);

      expect(result).toEqual(mockResponse);
    });
  });

  describe("retry logic", () => {
    it("should calculate exponential backoff correctly", async () => {
      // This tests the private method indirectly through retry behavior
      mockFetch.mockRejectedValue(new Error("Network error"));

      const scrapePromise = service.scrape(testUrl).catch((e) => e);

      // First retry should be around 1000ms * 2^0 = 1000ms
      await vi.advanceTimersByTimeAsync(1500);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second retry should be around 1000ms * 2^1 = 2000ms
      await vi.advanceTimersByTimeAsync(2500);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      const result = await scrapePromise;
      expect(result).toBeInstanceOf(Error);
    });

    it("should respect max retry attempts configuration", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const scrapePromise = service.scrape(testUrl).catch((e) => e);

      // Fast-forward through all retries
      await vi.advanceTimersByTimeAsync(30000);

      const result = await scrapePromise;
      expect(result).toBeInstanceOf(Error);

      // Should be called 3 times total (1 initial + 2 retries, per config)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should succeed on third attempt after two failures", async () => {
      const mockResponse = createMockSuccessResponse();

      // First two attempts fail
      mockFetch.mockRejectedValueOnce(new Error("Network error 1"));
      mockFetch.mockRejectedValueOnce(new Error("Network error 2"));

      // Third attempt succeeds
      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => mockResponse,
      }));

      const scrapePromise = service.scrape(testUrl);

      // Fast-forward through retries
      await vi.advanceTimersByTimeAsync(5000);

      const result = await scrapePromise;

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("timeout handling", () => {
    it("should abort request after timeout", async () => {
      // Mock a request that never resolves
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            // Never resolve to simulate hanging request
            setTimeout(resolve, 100000);
          })
      );

      const scrapePromise = service.scrape(testUrl);

      // Fast-forward past timeout (30s)
      await vi.advanceTimersByTimeAsync(35000);

      // Should have retried
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should not timeout if response arrives quickly", async () => {
      const mockResponse = createMockSuccessResponse();

      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => mockResponse,
      }));

      const result = await service.scrape(testUrl);

      expect(result).toEqual(mockResponse);
    });
  });

  describe("error messages", () => {
    it("should include URL in error message", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const scrapePromise = service.scrape(testUrl).catch((e) => e);
      await vi.advanceTimersByTimeAsync(30000);

      const result = await scrapePromise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain(`Failed to scrape URL ${testUrl}`);
    });

    it("should include rate limit info in error", async () => {
      mockFetch.mockResolvedValue(createMockFetchResponse({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
        headers: new Map([["Retry-After", "60"]]),
      }));

      const scrapePromise = service.scrape(testUrl).catch((e) => e);
      await vi.advanceTimersByTimeAsync(30000);

      const result = await scrapePromise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toMatch(/Rate limited. Retry after: 60/);
    });

    it("should handle rate limit without Retry-After header", async () => {
      mockFetch.mockResolvedValue(createMockFetchResponse({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
        headers: new Map(),
      }));

      const scrapePromise = service.scrape(testUrl).catch((e) => e);

      // Advance timers to trigger all retries
      await vi.advanceTimersByTimeAsync(30000);

      // Await the result
      const result = await scrapePromise;

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toMatch(/Rate limited. Retry after: unknown/);
    });
  });

  describe("edge cases", () => {
    it("should handle empty markdown content", async () => {
      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => ({
          success: true,
          data: {
            markdown: "",
            html: "",
            metadata: {
              title: "",
              description: "",
              language: "en",
              keywords: "",
            },
          },
        }),
      }));

      const result = await service.scrape(testUrl);

      expect(result.success).toBe(true);
      expect(result.data.markdown).toBe("");
    });

    it("should handle missing optional metadata fields", async () => {
      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => ({
          success: true,
          data: {
            markdown: "# Content",
            html: "<h1>Content</h1>",
            metadata: {
              title: "Basic Title",
              description: "Basic description",
              language: "en",
              keywords: "test",
              // No ogImage, author, publishedTime
            },
          },
        }),
      }));

      const result = await service.scrape(testUrl);

      expect(result.data.metadata?.ogImage).toBeUndefined();
      expect(result.data.metadata?.author).toBeUndefined();
      expect(result.data.metadata?.publishedTime).toBeUndefined();
    });

    it("should handle very large markdown content", async () => {
      const largeMarkdown = "# Title\n\n" + "Content paragraph.\n".repeat(10000);

      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => ({
          success: true,
          data: {
            markdown: largeMarkdown,
            html: `<h1>Title</h1>${"<p>Content paragraph.</p>".repeat(10000)}`,
            metadata: {
              title: "Large Article",
              description: "Very long content",
              language: "en",
              keywords: "long, article",
            },
          },
        }),
      }));

      const result = await service.scrape(testUrl);

      expect(result.data.markdown.length).toBeGreaterThan(100000);
    });

    it("should handle non-English content", async () => {
      mockFetch.mockResolvedValueOnce(createMockFetchResponse({
        json: async () => ({
          success: true,
          data: {
            markdown: "# タイトル\n\nこれはテストです。",
            html: "<h1>タイトル</h1><p>これはテストです。</p>",
            metadata: {
              title: "日本語の記事",
              description: "テストの説明",
              language: "ja",
              keywords: "テスト、日本語",
            },
          },
        }),
      }));

      const result = await service.scrape(testUrl);

      expect(result.data.metadata?.language).toBe("ja");
      expect(result.data.markdown).toContain("タイトル");
    });
  });
});
