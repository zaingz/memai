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
  GenerateDailyDigestRequest,
  GenerateDailyDigestResponse,
  GetDailyDigestRequest,
  GetDailyDigestResponse,
  ListDailyDigestsRequest,
  ListDailyDigestsResponse,
} from "./types";
import { bookmarkCreatedTopic } from "./events/bookmark-created.events";
import { BookmarkRepository } from "./repositories/bookmark.repository";
import { TranscriptionRepository } from "./repositories/transcription.repository";
import { DailyDigestRepository } from "./repositories/daily-digest.repository";
import { Transcription } from "./types/domain.types";
import { DailyDigestService } from "./services/daily-digest.service";
import { getDigestDateRange, parseDigestDate } from "./config/daily-digest.config";

// Initialize repositories
const bookmarkRepo = new BookmarkRepository(db);
const transcriptionRepo = new TranscriptionRepository(db);
const dailyDigestRepo = new DailyDigestRepository(db);

// Initialize services
const dailyDigestService = new DailyDigestService(dailyDigestRepo);

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
    if (!req.url || !req.client_time) {
      throw APIError.invalidArgument("url and client_time are required");
    }

    // Default source to 'web' if not provided (triggers auto-classification)
    const source = req.source || BookmarkSource.WEB;

    // Create the bookmark
    const bookmark = await bookmarkRepo.create({
      url: req.url,
      title: req.title || null,
      source,
      client_time: req.client_time,
      metadata: req.metadata || null,
    });

    log.info("Bookmark created, publishing event for classification", {
      bookmarkId: bookmark.id,
      url: bookmark.url,
      source: bookmark.source,
    });

    // Publish bookmark-created event for all bookmarks
    // Classification processor will handle source detection and downstream pipelines
    try {
      const messageId = await bookmarkCreatedTopic.publish({
        bookmarkId: bookmark.id,
        url: bookmark.url,
        source: bookmark.source,
        title: bookmark.title || undefined,
      });

      log.info("Successfully published bookmark-created event", {
        bookmarkId: bookmark.id,
        messageId,
      });
    } catch (error) {
      log.error(error, "Failed to publish bookmark-created event", {
        bookmarkId: bookmark.id,
      });
      // Don't fail the bookmark creation if event publishing fails
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

// ============================================
// Daily Digest Endpoints
// ============================================

// GENERATE DAILY DIGEST - Generate or retrieve daily digest for a date
// (Used for manual triggering with optional date parameter)
export const generateDailyDigest = api(
  { expose: true, method: "POST", path: "/digests/generate" },
  async (req?: GenerateDailyDigestRequest): Promise<GenerateDailyDigestResponse> => {
    // Determine the date for digest generation
    // If date is provided, use it; otherwise use yesterday
    let digestDate: Date;

    if (req?.date) {
      try {
        digestDate = parseDigestDate(req.date);
      } catch (error) {
        throw APIError.invalidArgument("Invalid date format. Use YYYY-MM-DD");
      }
    } else {
      // Default: generate digest for yesterday
      const { digestDate: yesterday } = getDigestDateRange();
      digestDate = yesterday;
    }

    log.info("Generating daily digest", {
      digestDate: digestDate.toISOString().split("T")[0],
      userId: req?.user_id || "global",
    });

    try {
      const digest = await dailyDigestService.generateDailyDigest({
        date: digestDate,
        userId: req?.user_id,
        forceRegenerate: false,
      });

      return {
        digest,
        message: digest.digest_content
          ? "Daily digest generated successfully"
          : "Daily digest scaffolding completed (summarization pending)",
      };
    } catch (error) {
      log.error(error, "Failed to generate daily digest", {
        digestDate: digestDate.toISOString().split("T")[0],
      });

      throw APIError.internal(
        `Failed to generate daily digest: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);

// GET DAILY DIGEST - Get digest for a specific date
export const getDailyDigest = api(
  { expose: true, method: "GET", path: "/digests/:date" },
  async (req: GetDailyDigestRequest): Promise<GetDailyDigestResponse> => {
    let digestDate: Date;

    try {
      digestDate = parseDigestDate(req.date);
    } catch (error) {
      throw APIError.invalidArgument("Invalid date format. Use YYYY-MM-DD");
    }

    log.info("Fetching daily digest", {
      digestDate: req.date,
      userId: req.user_id || "global",
    });

    const digest = await dailyDigestService.getDigestByDate(
      digestDate,
      req.user_id
    );

    if (!digest) {
      log.info("Daily digest not found", {
        digestDate: req.date,
        userId: req.user_id || "global",
      });
    }

    return { digest };
  }
);

// LIST DAILY DIGESTS - List all digests with pagination
export const listDailyDigests = api(
  { expose: true, method: "GET", path: "/digests" },
  async (req: ListDailyDigestsRequest): Promise<ListDailyDigestsResponse> => {
    const limit = req.limit || 30;
    const offset = req.offset || 0;

    log.info("Listing daily digests", {
      limit,
      offset,
      userId: req.user_id || "global",
    });

    const { digests, total } = await dailyDigestService.listDigests({
      limit,
      offset,
      userId: req.user_id,
    });

    return { digests, total };
  }
);

// CRON JOB ENDPOINT - Generate yesterday's digest (no parameters for cron compatibility)
// This endpoint is called by the daily cron job at 9 PM GMT
export const generateYesterdaysDigest = api(
  { expose: false, method: "POST", path: "/digests/generate-yesterday" },
  async (): Promise<GenerateDailyDigestResponse> => {
    // Generate digest for yesterday (default behavior)
    const { digestDate } = getDigestDateRange();

    log.info("Cron job triggered: Generating yesterday's digest", {
      digestDate: digestDate.toISOString().split("T")[0],
    });

    try {
      const digest = await dailyDigestService.generateDailyDigest({
        date: digestDate,
        forceRegenerate: false,
      });

      return {
        digest,
        message: "Yesterday's digest generated successfully by cron job",
      };
    } catch (error) {
      log.error(error, "Cron job failed to generate yesterday's digest", {
        digestDate: digestDate.toISOString().split("T")[0],
      });

      throw APIError.internal(
        `Failed to generate yesterday's digest: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);
