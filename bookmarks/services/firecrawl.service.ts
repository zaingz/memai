import log from "encore.dev/log";
import { FIRECRAWL_CONFIG } from "../config/firecrawl.config";
import type { FirecrawlScrapeResponse } from "../types/web-content.types";

/**
 * Service for interacting with FireCrawl API
 * Handles web content extraction with retry logic and error handling
 */
export class FirecrawlService {
  constructor(private readonly apiKey: string) {}

  /**
   * Scrapes a URL and returns clean markdown content with metadata
   *
   * @param url - The URL to scrape
   * @returns FireCrawl response with markdown, HTML, and metadata
   * @throws Error if scraping fails after all retries
   */
  async scrape(url: string): Promise<FirecrawlScrapeResponse> {
    const startTime = Date.now();

    log.info("Starting FireCrawl scrape", { url });

    try {
      const response = await this.fetchWithRetry(url);
      const durationMs = Date.now() - startTime;

      log.info("FireCrawl scrape successful", {
        url,
        durationMs,
        contentLength: response.data.markdown?.length || 0,
        hasMetadata: !!response.data.metadata,
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      log.error(error, "FireCrawl scrape failed", {
        url,
        durationMs,
        errorMessage,
      });

      throw new Error(`Failed to scrape URL ${url}: ${errorMessage}`);
    }
  }

  /**
   * Internal method with retry logic and exponential backoff
   */
  private async fetchWithRetry(
    url: string,
    attempt = 1
  ): Promise<FirecrawlScrapeResponse> {
    try {
      // Set up timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        FIRECRAWL_CONFIG.timeout
      );

      // Make API request
      const response = await fetch(`${FIRECRAWL_CONFIG.baseUrl}/scrape`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: FIRECRAWL_CONFIG.formats,
          onlyMainContent: FIRECRAWL_CONFIG.onlyMainContent,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-200 responses
      if (!response.ok) {
        const errorText = await response.text();

        // Check for rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          throw new Error(
            `Rate limited. Retry after: ${retryAfter || 'unknown'}`
          );
        }

        throw new Error(
          `FireCrawl API error (${response.status}): ${errorText}`
        );
      }

      // Parse and validate response
      const data = (await response.json()) as FirecrawlScrapeResponse;

      if (!data.success) {
        throw new Error("FireCrawl returned unsuccessful response");
      }

      return data;

    } catch (error) {
      // Retry logic with exponential backoff
      if (attempt < FIRECRAWL_CONFIG.retries.maxAttempts) {
        const delay = this.calculateBackoffDelay(attempt);

        log.warn("Retrying FireCrawl request", {
          url,
          attempt,
          nextAttempt: attempt + 1,
          delayMs: delay,
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));

        // Recursive retry
        return this.fetchWithRetry(url, attempt + 1);
      }

      // All retries exhausted
      throw error;
    }
  }

  /**
   * Calculates exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const { baseDelayMs, maxDelayMs } = FIRECRAWL_CONFIG.retries;

    // Exponential backoff: baseDelay * 2^(attempt - 1)
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);

    // Add jitter (random 0-25% of delay)
    const jitter = exponentialDelay * Math.random() * 0.25;

    // Cap at maxDelay
    return Math.min(exponentialDelay + jitter, maxDelayMs);
  }
}
