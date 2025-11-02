import { Subscription } from "encore.dev/pubsub";
import log from "encore.dev/log";
import { bookmarkSourceClassifiedTopic } from "../events/bookmark-source-classified.events";
import { BookmarkRepository } from "../repositories/bookmark.repository";
import { db } from "../db";
import { LinkPreviewService } from "../services/link-preview.service";

const bookmarkRepo = new BookmarkRepository(db);
const linkPreviewService = new LinkPreviewService();

/**
 * Processor responsible for enriching bookmarks with visual metadata such as thumbnails and favicons.
 * Runs after the bookmark has been classified so we can apply source-specific fallbacks (e.g., YouTube).
 */
export async function handleBookmarkMetadata(event: {
  bookmarkId: number;
  url: string;
  source: string;
  title?: string;
}): Promise<void> {
  const { bookmarkId, url, title } = event;

  try {
    log.info("Starting link preview enrichment", {
      bookmarkId,
      url,
    });

    const bookmark = await bookmarkRepo.findByIdRaw(bookmarkId);
    if (!bookmark) {
      log.warn("Bookmark not found while enriching metadata", { bookmarkId, url });
      return;
    }

    const existingPreview = bookmark.metadata?.linkPreview ?? null;
    const preview = await linkPreviewService.fetchMetadata(url, {
      existingMetadata: existingPreview,
      fallbackTitle: title ?? bookmark.title,
    });

    if (!preview) {
      log.warn("No preview metadata could be generated", { bookmarkId, url });
      return;
    }

    await bookmarkRepo.mergeMetadata(bookmarkId, {
      linkPreview: preview,
    });

    log.info("Bookmark metadata enriched", {
      bookmarkId,
      hasThumbnail: !!preview.thumbnailUrl,
    });
  } catch (error) {
    log.error(error, "Failed to enrich bookmark metadata", {
      bookmarkId,
      url,
    });
    throw error;
  }
}

export const bookmarkMetadataSubscription = new Subscription(
  bookmarkSourceClassifiedTopic,
  "bookmark-metadata-processor",
  {
    handler: handleBookmarkMetadata,
  }
);
