import { Topic } from "encore.dev/pubsub";

/**
 * Event published after FireCrawl successfully extracts web content
 * Consumed by content-summary processor for AI summarization
 */
export interface ContentExtractedEvent {
  bookmarkId: number;
  content: string; // Markdown content for summarization
  wordCount: number; // For content type classification
  source: string; // Original bookmark source (blog, reddit, etc.)
}

/**
 * Topic for content extraction events
 * Delivery guarantee: at-least-once (processors must be idempotent)
 */
export const contentExtractedTopic = new Topic<ContentExtractedEvent>(
  "content-extracted",
  {
    deliveryGuarantee: "at-least-once",
  }
);
