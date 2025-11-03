import { Subscription } from "encore.dev/pubsub";
import log from "encore.dev/log";
import { bookmarkSourceClassifiedTopic } from "../events/bookmark-source-classified.events";
import { BookmarkRepository } from "../repositories/bookmark.repository";
import { db } from "../db";
import { LinkPreviewService } from "../services/link-preview.service";
import { YouTubeDownloaderService } from "../services/youtube-downloader.service";
import { extractYouTubeVideoId } from "../utils/youtube-url.util";
import { BookmarkSource } from "../types/domain.types";

const bookmarkRepo = new BookmarkRepository(db);
const linkPreviewService = new LinkPreviewService();
const youtubeDownloader = new YouTubeDownloaderService();

/**
 * Processor responsible for enriching bookmarks with visual metadata such as thumbnails and favicons.
 * Runs after the bookmark has been classified so we can apply source-specific fallbacks (e.g., YouTube).
 * For YouTube bookmarks, also extracts rich metadata using yt-dlp.
 */
export async function handleBookmarkMetadata(event: {
  bookmarkId: number;
  url: string;
  source: string;
  title?: string;
}): Promise<void> {
  const { bookmarkId, url, source, title } = event;

  try {
    log.info("Starting bookmark metadata enrichment", {
      bookmarkId,
      url,
      source,
    });

    const bookmark = await bookmarkRepo.findByIdRaw(bookmarkId);
    if (!bookmark) {
      log.warn("Bookmark not found while enriching metadata", { bookmarkId, url });
      return;
    }

    // Extract YouTube-specific metadata if this is a YouTube bookmark
    if (source === BookmarkSource.YOUTUBE) {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        try {
          log.info("Extracting YouTube metadata", { bookmarkId, videoId });
          const youtubeMetadata = await youtubeDownloader.extractMetadata(videoId);

          await bookmarkRepo.mergeMetadata(bookmarkId, {
            youtubeMetadata,
          });

          log.info("YouTube metadata extracted and saved", {
            bookmarkId,
            videoId,
            duration: youtubeMetadata.duration,
            uploader: youtubeMetadata.uploader,
          });
        } catch (ytError) {
          log.warn(ytError, "Failed to extract YouTube metadata, continuing with link preview", {
            bookmarkId,
            videoId,
          });
        }
      }
    }

    // Extract general link preview metadata (thumbnails, etc.)
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
      hasYouTubeMetadata: source === BookmarkSource.YOUTUBE,
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
