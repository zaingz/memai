import { Subscription } from "encore.dev/pubsub";
import log from "encore.dev/log";
import { secret } from "encore.dev/config";
import { bookmarkSourceClassifiedTopic } from "../events/bookmark-source-classified.events";
import { contentExtractedTopic } from "../events/content-extracted.events";
import { BookmarkSourceClassifiedEvent, BookmarkSource, ContentStatus } from "../types";
import { FirecrawlService } from "../services/firecrawl.service";
import { WebContentRepository } from "../repositories/web-content.repository";
import { calculateReadingTime } from "../config/firecrawl.config";
import { db } from "../db";

// Initialize dependencies
const firecrawlApiKey = secret("FirecrawlAPIKey");
const firecrawlService = new FirecrawlService(firecrawlApiKey());
const webContentRepo = new WebContentRepository(db);

/**
 * Textual sources that require web content extraction
 * Audio sources (YouTube, Podcast) are handled by audio-download processor
 */
const TEXTUAL_SOURCES = [
  BookmarkSource.BLOG,
  BookmarkSource.WEB,
  BookmarkSource.REDDIT,
  BookmarkSource.TWITTER,
  BookmarkSource.LINKEDIN,
];

/**
 * Content Extraction Processor
 *
 * Responsibility:
 * - Receives bookmark-source-classified events
 * - Filters for textual sources
 * - Extracts content using FireCrawl API
 * - Stores content in web_contents table
 * - Publishes content-extracted event for summarization
 *
 * Idempotency: Checks existing status before processing
 * Fault Tolerance: Marks as failed on error, allowing manual retry
 *
 * Exported for testing purposes
 */
export async function handleContentExtraction(
  event: BookmarkSourceClassifiedEvent
): Promise<void> {
  const { bookmarkId, source, url, title } = event;

  // Skip non-textual sources (audio handled by separate processor)
  if (!TEXTUAL_SOURCES.includes(source as BookmarkSource)) {
    log.info("Skipping content extraction for non-textual source", {
      bookmarkId,
      source,
    });
    return;
  }

  try {
    log.info("Starting content extraction", {
      bookmarkId,
      url,
      source,
    });

    // Check for idempotency - avoid duplicate processing
    const existing = await webContentRepo.findByBookmarkId(bookmarkId);

    if (existing && existing.status !== ContentStatus.PENDING) {
      log.warn("Content already processed or in progress, skipping", {
        bookmarkId,
        currentStatus: existing.status,
      });
      return;
    }

    // Create pending record if doesn't exist
    if (!existing) {
      await webContentRepo.createPending(bookmarkId);
      log.info("Created pending web content record", { bookmarkId });
    }

    // Mark as processing
    await webContentRepo.markAsProcessing(bookmarkId);

    // Extract content using FireCrawl
    const scraped = await firecrawlService.scrape(url);

    if (!scraped.success || !scraped.data.markdown) {
      throw new Error("FireCrawl returned unsuccessful response or missing markdown");
    }

    // Calculate content metrics
    const markdown = scraped.data.markdown;
    const wordCount = markdown.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = markdown.length;
    const estimatedReadingMinutes = calculateReadingTime(wordCount);

    // Safely extract metadata with fallbacks for missing/undefined metadata
    const metadata = scraped.data.metadata || {};

    log.info("Content extraction metrics calculated", {
      bookmarkId,
      wordCount,
      charCount,
      estimatedReadingMinutes,
      hasMetadata: !!scraped.data.metadata,
    });

    // Store extracted content
    await webContentRepo.updateContent(bookmarkId, {
      raw_markdown: markdown,
      raw_html: scraped.data.html || "",
      // Safe metadata access with fallback chain: metadata → event title → "Untitled"
      page_title: metadata.title || title || "Untitled",
      page_description: metadata.description || "",
      language: metadata.language || "en",
      word_count: wordCount,
      char_count: charCount,
      estimated_reading_minutes: estimatedReadingMinutes,
      // Store full metadata object (could be empty {})
      metadata: metadata,
    });

    log.info("Content extraction completed successfully", {
      bookmarkId,
      wordCount,
      pageTitle: metadata.title || title || "Untitled",
    });

    // Publish event for summarization stage
    const messageId = await contentExtractedTopic.publish({
      bookmarkId,
      content: markdown,
      wordCount,
      source,
    });

    log.info("Published content-extracted event", {
      bookmarkId,
      messageId,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    log.error(error, "Content extraction failed", {
      bookmarkId,
      url,
      source,
      errorMessage,
    });

    // Mark as failed for visibility and potential manual retry
    await webContentRepo.markAsFailed(
      bookmarkId,
      `Extraction failed: ${errorMessage}`
    );
  }
}

/**
 * Subscription to bookmark-source-classified topic
 * Processes all newly classified bookmarks, filtering for textual sources
 */
export const contentExtractionSubscription = new Subscription(
  bookmarkSourceClassifiedTopic,
  "content-extraction-processor",
  {
    handler: handleContentExtraction,
  }
);
