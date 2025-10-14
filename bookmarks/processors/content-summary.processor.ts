import { Subscription } from "encore.dev/pubsub";
import log from "encore.dev/log";
import { contentExtractedTopic, ContentExtractedEvent } from "../events/content-extracted.events";
import { OpenAIService } from "../services/openai.service";
import { WebContentRepository } from "../repositories/web-content.repository";
import { getContentType } from "../config/firecrawl.config";
import { BookmarkSource } from "../types";
import { db } from "../db";
import { secret } from "encore.dev/config";

// Initialize dependencies
const openaiApiKey = secret("OpenAIAPIKey");
const openaiService = new OpenAIService(openaiApiKey());
const webContentRepo = new WebContentRepository(db);

/**
 * Content Summary Processor
 *
 * Responsibility:
 * - Receives content-extracted events
 * - Classifies content type (short_post, article, long_form)
 * - Generates AI summary using OpenAI
 * - Stores summary in web_contents table
 * - Marks content as completed
 *
 * Content Type Classification:
 * - short_post (<500 words): Brief summary, max 150 tokens
 * - article (500-2000 words): Standard summary, max 300 tokens
 * - long_form (>2000 words): Comprehensive summary, max 500 tokens
 *
 * Exported for testing purposes
 */
export async function handleContentSummary(
  event: ContentExtractedEvent
): Promise<void> {
  const { bookmarkId, content, wordCount, source } = event;

  try {
    log.info("Starting content summarization", {
      bookmarkId,
      wordCount,
      source,
    });

    // Classify content type for appropriate summarization
    const contentType = getContentType(wordCount);

    log.info("Content type classified", {
      bookmarkId,
      contentType,
      wordCount,
    });

    // Select appropriate max tokens based on content type
    const maxTokens = (() => {
      switch (contentType) {
        case 'short_post': return 150;
        case 'article': return 300;
        case 'long_form': return 500;
      }
    })();

    // Generate summary using OpenAI with content-type-aware prompts
    const summary = await openaiService.generateSummary(
      content,
      source as BookmarkSource,
      { maxTokens, contentType }
    );

    log.info("Summary generated successfully", {
      bookmarkId,
      summaryLength: summary.length,
      contentType,
    });

    // Store summary
    await webContentRepo.updateSummary(bookmarkId, summary);

    // Mark as completed
    await webContentRepo.markAsCompleted(bookmarkId);

    log.info("Content summarization completed", {
      bookmarkId,
      summaryLength: summary.length,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    log.error(error, "Content summarization failed", {
      bookmarkId,
      wordCount,
      source,
      errorMessage,
    });

    // Mark as failed
    await webContentRepo.markAsFailed(
      bookmarkId,
      `Summarization failed: ${errorMessage}`
    );
  }
}

/**
 * Subscription to content-extracted topic
 * Processes all successfully extracted content for AI summarization
 */
export const contentSummarySubscription = new Subscription(
  contentExtractedTopic,
  "content-summary-processor",
  {
    handler: handleContentSummary,
  }
);
