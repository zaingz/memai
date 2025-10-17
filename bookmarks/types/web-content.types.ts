import { BookmarkSource } from "./domain.types";

/**
 * Web content processing status lifecycle
 */
export enum ContentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * Database row interface for web_contents table
 */
export interface WebContent {
  id: number;
  bookmark_id: number;
  raw_markdown: string | null;
  raw_html: string | null;
  page_title: string | null;
  page_description: string | null;
  language: string | null;
  word_count: number | null;
  char_count: number | null;
  estimated_reading_minutes: number | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  status: ContentStatus;
  error_message: string | null;
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Content type classification based on length
 */
export type ContentType = 'short_post' | 'article' | 'long_form';

/**
 * FireCrawl API response structure
 * Note: metadata can be undefined for some pages
 */
export interface FirecrawlScrapeResponse {
  success: boolean;
  data: {
    markdown: string;
    html: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      keywords?: string;
      ogImage?: string;
      author?: string;
      publishedTime?: string;
      [key: string]: unknown;
    };
  };
}

/**
 * Unified digest content item (audio + web)
 * Used by map-reduce digest service
 */
export interface DigestContentItem {
  bookmark_id: number;
  content_type: 'audio' | 'article';
  summary: string;
  source: BookmarkSource;
  title?: string | null;
  duration?: number;        // audio only
  word_count?: number;      // article only
  reading_minutes?: number; // article only
  sentiment?: "positive" | "negative" | "neutral" | null;
  created_at: Date;
}
