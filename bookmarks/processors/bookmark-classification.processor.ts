import { Subscription } from "encore.dev/pubsub";
import { bookmarkCreatedTopic } from "../events/bookmark-created.events";
import { bookmarkSourceClassifiedTopic } from "../events/bookmark-source-classified.events";
import { BookmarkRepository } from "../repositories/bookmark.repository";
import { db } from "../db";
import { classifyBookmarkUrl } from "../utils/bookmark-classifier.util";
import { BookmarkSource } from "../types/domain.types";
import { BaseProcessor } from "../../shared/processors/base.processor";

const bookmarkRepo = new BookmarkRepository(db);

/**
 * Bookmark Classification Event Type
 */
interface BookmarkCreatedEvent {
  bookmarkId: number;
  url: string;
  source: string;
  title?: string;
}

/**
 * Bookmark Classification Processor
 * Single responsibility: Classify bookmark URL and update source
 * Independent: Publishes generic event, doesn't know about downstream processors
 */
class BookmarkClassificationProcessor extends BaseProcessor<BookmarkCreatedEvent> {
  constructor(
    private readonly bookmarkRepo: BookmarkRepository
  ) {
    super("Bookmark Classification Processor");
  }

  protected async processEvent(event: BookmarkCreatedEvent): Promise<void> {
    const { bookmarkId, url, source, title } = event;

    this.logStep("Received bookmark for classification", {
      bookmarkId,
      url,
      currentSource: source,
    });

    let finalSource = source;

    // Classify URL if source is unknown ('web')
    if (source === BookmarkSource.WEB) {
      const detectedSource = classifyBookmarkUrl(url);

      this.logStep("URL classification completed", {
        bookmarkId,
        url,
        detectedSource,
      });

      // Update source in database if different from 'web'
      if (detectedSource !== BookmarkSource.WEB) {
        try {
          await this.bookmarkRepo.updateSource(bookmarkId, detectedSource);
          this.logStep("Updated bookmark source", {
            bookmarkId,
            oldSource: source,
            newSource: detectedSource,
          });
          finalSource = detectedSource;
        } catch (error) {
          this.logError(error, "Failed to update bookmark source", {
            bookmarkId,
            detectedSource,
          });
          // Continue with original source even if update fails
        }
      }
    } else {
      this.logStep("Skipping classification, source already known", {
        bookmarkId,
        source,
      });
    }

    // Publish generic classified event
    // Downstream processors decide if they need to act on this source
    const messageId = await bookmarkSourceClassifiedTopic.publish({
      bookmarkId,
      source: finalSource,
      url,
      title,
    });

    this.logStep("Published bookmark-source-classified event", {
      bookmarkId,
      source: finalSource,
      messageId,
    });
  }
}

// Create processor instance
const bookmarkClassificationProcessor = new BookmarkClassificationProcessor(
  bookmarkRepo
);

/**
 * Legacy handler function for backward compatibility
 * Exported for testing purposes
 */
export async function handleBookmarkClassification(event: BookmarkCreatedEvent): Promise<void> {
  return bookmarkClassificationProcessor.safeProcess(event);
}

/**
 * Subscription to bookmark-created topic
 * Processes all newly created bookmarks for classification
 */
export const bookmarkClassificationSubscription = new Subscription(
  bookmarkCreatedTopic,
  "bookmark-classification-processor",
  {
    handler: (event) => bookmarkClassificationProcessor.safeProcess(event),
  }
);
