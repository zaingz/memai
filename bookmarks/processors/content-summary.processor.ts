import { Subscription } from "encore.dev/pubsub";
import { contentExtractedTopic, ContentExtractedEvent } from "../events/content-extracted.events";
import { OpenAIService } from "../services/openai.service";
import { WebContentRepository } from "../repositories/web-content.repository";
import { getContentType } from "../config/firecrawl.config";
import { BookmarkSource } from "../types";
import { db } from "../db";
import { secret } from "encore.dev/config";
import { BaseProcessor } from "../../shared/processors/base.processor";

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
 */
class ContentSummaryProcessor extends BaseProcessor<ContentExtractedEvent> {
  constructor(
    private readonly openaiService: OpenAIService,
    private readonly webContentRepo: WebContentRepository
  ) {
    super("Content Summary Processor");
  }

  protected async processEvent(event: ContentExtractedEvent): Promise<void> {
    const { bookmarkId, content, wordCount, source } = event;

    try {
      this.logStep("Starting content summarization", {
        bookmarkId,
        wordCount,
        source,
      });

      // Classify content type for appropriate summarization
      const contentType = getContentType(wordCount);

      this.logStep("Content type classified", {
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
      const summary = await this.openaiService.generateSummary(
        content,
        source as BookmarkSource,
        { maxTokens, contentType }
      );

      this.logStep("Summary generated successfully", {
        bookmarkId,
        summaryLength: summary.length,
        contentType,
      });

      // Store summary
      await this.webContentRepo.updateSummary(bookmarkId, summary);

      // Mark as completed
      await this.webContentRepo.markAsCompleted(bookmarkId);

      this.logStep("Content summarization completed", {
        bookmarkId,
        summaryLength: summary.length,
      });

    } catch (error) {
      // Mark as failed
      await this.webContentRepo.markAsFailed(
        bookmarkId,
        `Summarization failed: ${error instanceof Error ? error.message : String(error)}`
      );

      // Re-throw to let BaseProcessor handle final logging
      throw error;
    }
  }
}

// Create processor instance
const contentSummaryProcessor = new ContentSummaryProcessor(
  openaiService,
  webContentRepo
);

/**
 * Legacy handler function for backward compatibility
 * Exported for testing purposes
 */
export async function handleContentSummary(
  event: ContentExtractedEvent
): Promise<void> {
  return contentSummaryProcessor.safeProcess(event);
}

/**
 * Subscription to content-extracted topic
 * Processes all successfully extracted content for AI summarization
 */
export const contentSummarySubscription = new Subscription(
  contentExtractedTopic,
  "content-summary-processor",
  {
    handler: (event) => contentSummaryProcessor.safeProcess(event),
  }
);
