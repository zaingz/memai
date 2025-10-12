import { Subscription } from "encore.dev/pubsub";
import log from "encore.dev/log";
import { bookmarkCreatedTopic } from "../events/bookmark-created.events";
import { bookmarkSourceClassifiedTopic } from "../events/bookmark-source-classified.events";
import { BookmarkRepository } from "../repositories/bookmark.repository";
import { db } from "../db";
import { classifyBookmarkUrl } from "../utils/bookmark-classifier.util";
import { BookmarkSource } from "../types/domain.types";

const bookmarkRepo = new BookmarkRepository(db);

/**
 * Bookmark Classification Processor
 * Single responsibility: Classify bookmark URL and update source
 * Independent: Publishes generic event, doesn't know about downstream processors
 */
async function handleBookmarkClassification(event: {
  bookmarkId: number;
  url: string;
  source: string;
  title?: string;
}): Promise<void> {
  const { bookmarkId, url, source, title } = event;

  log.info("Received bookmark for classification", {
    bookmarkId,
    url,
    currentSource: source,
  });

  let finalSource = source;

  // Classify URL if source is unknown ('web')
  if (source === BookmarkSource.WEB) {
    const detectedSource = classifyBookmarkUrl(url);

    log.info("URL classification completed", {
      bookmarkId,
      url,
      detectedSource,
    });

    // Update source in database if different from 'web'
    if (detectedSource !== BookmarkSource.WEB) {
      try {
        await bookmarkRepo.updateSource(bookmarkId, detectedSource);
        log.info("Updated bookmark source", {
          bookmarkId,
          oldSource: source,
          newSource: detectedSource,
        });
        finalSource = detectedSource;
      } catch (error) {
        log.error(error, "Failed to update bookmark source", {
          bookmarkId,
          detectedSource,
        });
        // Continue with original source even if update fails
      }
    }
  } else {
    log.info("Skipping classification, source already known", {
      bookmarkId,
      source,
    });
  }

  // Publish generic classified event
  // Downstream processors decide if they need to act on this source
  try {
    const messageId = await bookmarkSourceClassifiedTopic.publish({
      bookmarkId,
      source: finalSource,
      url,
      title,
    });

    log.info("Published bookmark-source-classified event", {
      bookmarkId,
      source: finalSource,
      messageId,
    });
  } catch (error) {
    log.error(error, "Failed to publish bookmark-source-classified event", {
      bookmarkId,
      source: finalSource,
    });
    throw error; // Rethrow to trigger retry
  }
}

/**
 * Subscription to bookmark-created topic
 * Processes all newly created bookmarks for classification
 */
export const bookmarkClassificationSubscription = new Subscription(
  bookmarkCreatedTopic,
  "bookmark-classification-processor",
  {
    handler: handleBookmarkClassification,
  }
);
