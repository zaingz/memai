import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { db } from "./db";
import {
  CreateBookmarkRequest,
  BookmarkResponse,
  GetBookmarkRequest,
  UpdateBookmarkRequest,
  ListBookmarksRequest,
  ListBookmarksResponse,
  DeleteBookmarkRequest,
  DeleteBookmarkResponse,
  GetBookmarkDetailsRequest,
  BookmarkDetailsResponse,
  TranscriptionDetails,
  BookmarkSource,
} from "./types";
import { youtubeDownloadTopic } from "./events/youtube-download.events";
import { podcastDownloadTopic } from "./events/podcast-download.events";
import { BookmarkRepository } from "./repositories/bookmark.repository";
import { TranscriptionRepository } from "./repositories/transcription.repository";
import { Transcription } from "./types/domain.types";

// Initialize repositories
const bookmarkRepo = new BookmarkRepository(db);
const transcriptionRepo = new TranscriptionRepository(db);

/**
 * Maps a full Transcription domain object to a client-facing TranscriptionDetails view
 * Excludes internal implementation details like deepgram_response and processing timestamps
 */
function toTranscriptionDetails(t: Transcription): TranscriptionDetails {
  return {
    transcript: t.transcript,
    deepgram_summary: t.deepgram_summary,
    summary: t.summary,
    sentiment: t.sentiment,
    sentiment_score: t.sentiment_score,
    duration: t.duration,
    confidence: t.confidence,
    status: t.status,
    error_message: t.error_message,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

// CREATE - Add a new bookmark
export const create = api(
  { expose: true, method: "POST", path: "/bookmarks" },
  async (req: CreateBookmarkRequest): Promise<BookmarkResponse> => {
    // Validate required fields
    if (!req.url || !req.source || !req.client_time) {
      throw APIError.invalidArgument("url, source, and client_time are required");
    }

    // Create the bookmark
    const bookmark = await bookmarkRepo.create({
      url: req.url,
      title: req.title || null,
      source: req.source,
      client_time: req.client_time,
      metadata: req.metadata || null,
    });

    // If this is a YouTube bookmark, create a pending transcription and publish event
    if (bookmark.source === BookmarkSource.YOUTUBE) {
      log.info("Detected YouTube bookmark, will publish event", {
        bookmarkId: bookmark.id,
        source: bookmark.source,
      });

      try {
        // Create a pending transcription record
        await transcriptionRepo.createPending(bookmark.id);

        log.info("Created pending transcription record", {
          bookmarkId: bookmark.id,
        });

        // Publish event to trigger Stage 1: YouTube download
        const messageId = await youtubeDownloadTopic.publish({
          bookmarkId: bookmark.id,
          url: bookmark.url,
          title: bookmark.title || undefined,
        });

        log.info("Successfully published YouTube bookmark event", {
          bookmarkId: bookmark.id,
          messageId,
        });
      } catch (error) {
        log.error(error, "Failed to publish YouTube bookmark event", {
          bookmarkId: bookmark.id,
        });
        // Don't fail the bookmark creation if event publishing fails
      }
    } else if (bookmark.source === BookmarkSource.PODCAST) {
      log.info("Detected podcast bookmark, will publish event", {
        bookmarkId: bookmark.id,
        source: bookmark.source,
      });

      try {
        // Create a pending transcription record
        await transcriptionRepo.createPending(bookmark.id);

        log.info("Created pending transcription record", {
          bookmarkId: bookmark.id,
        });

        // Publish event to trigger Stage 1: Podcast download
        const messageId = await podcastDownloadTopic.publish({
          bookmarkId: bookmark.id,
          url: bookmark.url,
          title: bookmark.title || undefined,
        });

        log.info("Successfully published podcast bookmark event", {
          bookmarkId: bookmark.id,
          messageId,
        });
      } catch (error) {
        log.error(error, "Failed to publish podcast bookmark event", {
          bookmarkId: bookmark.id,
        });
        // Don't fail the bookmark creation if event publishing fails
      }
    } else {
      log.info("Not a YouTube or podcast bookmark, skipping transcription", {
        bookmarkId: bookmark.id,
        source: bookmark.source,
      });
    }

    return { bookmark };
  }
);

// READ - Get a bookmark by ID
export const get = api(
  { expose: true, method: "GET", path: "/bookmarks/:id" },
  async (req: GetBookmarkRequest): Promise<BookmarkResponse> => {
    const bookmark = await bookmarkRepo.findById(req.id);

    if (!bookmark) {
      throw APIError.notFound(`Bookmark with id ${req.id} not found`);
    }

    return { bookmark };
  }
);

// LIST - Get all bookmarks with pagination and filtering
export const list = api(
  { expose: true, method: "GET", path: "/bookmarks" },
  async (req: ListBookmarksRequest): Promise<ListBookmarksResponse> => {
    const limit = req.limit || 50;
    const offset = req.offset || 0;

    const { bookmarks, total } = await bookmarkRepo.list({
      limit,
      offset,
      source: req.source as BookmarkSource | undefined,
    });

    return { bookmarks, total };
  }
);

// UPDATE - Update a bookmark
export const update = api(
  { expose: true, method: "PUT", path: "/bookmarks/:id" },
  async (req: UpdateBookmarkRequest): Promise<BookmarkResponse> => {
    // Validate that at least one field is provided
    if (
      req.url === undefined &&
      req.title === undefined &&
      req.source === undefined &&
      req.metadata === undefined
    ) {
      throw APIError.invalidArgument("No fields to update");
    }

    const bookmark = await bookmarkRepo.update(req.id, {
      url: req.url,
      title: req.title,
      source: req.source,
      metadata: req.metadata,
    });

    return { bookmark };
  }
);

// DELETE - Delete a bookmark
export const remove = api(
  { expose: true, method: "DELETE", path: "/bookmarks/:id" },
  async (req: DeleteBookmarkRequest): Promise<DeleteBookmarkResponse> => {
    await bookmarkRepo.delete(req.id);
    return { success: true };
  }
);

// GET DETAILS - Get a bookmark with all enriched data (transcription, etc.)
export const getDetails = api(
  { expose: true, method: "GET", path: "/bookmarks/:id/details" },
  async (req: GetBookmarkDetailsRequest): Promise<BookmarkDetailsResponse> => {
    // Fetch the bookmark
    const bookmark = await bookmarkRepo.findById(req.id);

    if (!bookmark) {
      throw APIError.notFound(`Bookmark with id ${req.id} not found`);
    }

    // Fetch transcription if it exists (only relevant for YouTube bookmarks)
    const transcription = await transcriptionRepo.findByBookmarkId(req.id);

    log.info("Fetched bookmark details", {
      bookmarkId: req.id,
      source: bookmark.source,
      hasTranscription: !!transcription,
    });

    return {
      bookmark,
      transcription: transcription ? toTranscriptionDetails(transcription) : null,
    };
  }
);
