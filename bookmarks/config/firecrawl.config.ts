import type { ContentType } from "../types/web-content.types";

/**
 * FireCrawl API configuration
 * Environment-specific settings for web content extraction
 */
export const FIRECRAWL_CONFIG = {
  // API endpoint
  baseUrl: "https://api.firecrawl.dev/v1",

  // Request timeout (30 seconds)
  timeout: 30000,

  // Output formats to request
  formats: ["markdown", "html"] as const,

  // Extract main content only (skip nav, footer, ads)
  onlyMainContent: true,

  // Include page metadata
  includeMetadata: true,

  // Retry configuration
  retries: {
    maxAttempts: 3,
    baseDelayMs: 1000,    // Start at 1 second
    maxDelayMs: 10000,     // Cap at 10 seconds
    exponentialBackoff: true,
  },
} as const;

/**
 * Word count thresholds for content classification
 * Internal use only - used by getContentType()
 */
const CONTENT_TYPE_THRESHOLDS = {
  SHORT_POST: 500,      // < 500 words = short post (tweets, reddit comments)
  ARTICLE: 2000,        // 500-2000 words = article (blog posts)
  LONG_FORM: Infinity,  // > 2000 words = long-form (essays, documentation)
} as const;

/**
 * Reading speed for time estimation (words per minute)
 * Internal use only - used by calculateReadingTime()
 */
const READING_SPEED_WPM = 200;

/**
 * Determines content type based on word count
 * Used for prompt selection in summarization
 */
export function getContentType(wordCount: number): ContentType {
  if (wordCount < CONTENT_TYPE_THRESHOLDS.SHORT_POST) {
    return 'short_post';
  }
  if (wordCount < CONTENT_TYPE_THRESHOLDS.ARTICLE) {
    return 'article';
  }
  return 'long_form';
}

/**
 * Calculates estimated reading time in minutes
 */
export function calculateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / READING_SPEED_WPM);
}
