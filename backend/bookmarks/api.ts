import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
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
import { WebContentRepository } from "./repositories/web-content.repository";
import { Transcription } from "./types/domain.types";
import { DailyDigestService } from "./services/daily-digest.service";
import { getDigestDateRange, parseDigestDate } from "./config/daily-digest.config";

// Initialize repositories
const bookmarkRepo = new BookmarkRepository(db);
const transcriptionRepo = new TranscriptionRepository(db);
const dailyDigestRepo = new DailyDigestRepository(db);
const webContentRepo = new WebContentRepository(db);

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
  { expose: true, method: "POST", path: "/bookmarks", auth: true },
  async (req: CreateBookmarkRequest): Promise<BookmarkResponse> => {
    // Get authenticated user
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }
    const userId = auth.userID; // UUID from Supabase JWT

    // Validate required fields
    if (!req.url || !req.client_time) {
      throw APIError.invalidArgument("url and client_time are required");
    }

    // Default source to 'web' if not provided (triggers auto-classification)
    const source = req.source || BookmarkSource.WEB;

    // Create the bookmark
    const bookmark = await bookmarkRepo.create({
      user_id: userId,
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
  { expose: true, method: "GET", path: "/bookmarks/:id", auth: true },
  async (req: GetBookmarkRequest): Promise<BookmarkResponse> => {
    // Get authenticated user
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }
    const userId = auth.userID; // UUID from Supabase JWT

    const bookmark = await bookmarkRepo.findById(req.id, userId);

    if (!bookmark) {
      throw APIError.notFound(`Bookmark with id ${req.id} not found`);
    }

    return { bookmark };
  }
);

// LIST - Get all bookmarks with pagination and filtering
export const list = api(
  { expose: true, method: "GET", path: "/bookmarks", auth: true },
  async (req: ListBookmarksRequest): Promise<ListBookmarksResponse> => {
    // Get authenticated user
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }
    const userId = auth.userID; // UUID from Supabase JWT

    const limit = req.limit || 50;
    const offset = req.offset || 0;

    const { bookmarks, total } = await bookmarkRepo.list({
      userId,
      limit,
      offset,
      source: req.source as BookmarkSource | undefined,
    });

    return { bookmarks, total };
  }
);

// UPDATE - Update a bookmark
export const update = api(
  { expose: true, method: "PUT", path: "/bookmarks/:id", auth: true },
  async (req: UpdateBookmarkRequest): Promise<BookmarkResponse> => {
    // Get authenticated user
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }
    const userId = auth.userID; // UUID from Supabase JWT

    // Validate that at least one field is provided
    if (
      req.url === undefined &&
      req.title === undefined &&
      req.source === undefined &&
      req.metadata === undefined
    ) {
      throw APIError.invalidArgument("No fields to update");
    }

    const bookmark = await bookmarkRepo.update(req.id, userId, {
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
  { expose: true, method: "DELETE", path: "/bookmarks/:id", auth: true },
  async (req: DeleteBookmarkRequest): Promise<DeleteBookmarkResponse> => {
    // Get authenticated user
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }
    const userId = auth.userID; // UUID from Supabase JWT

    await bookmarkRepo.delete(req.id, userId);
    return { success: true };
  }
);

// GET DETAILS - Get a bookmark with all enriched data (transcription, etc.)
export const getDetails = api(
  { expose: true, method: "GET", path: "/bookmarks/:id/details", auth: true },
  async (req: GetBookmarkDetailsRequest): Promise<BookmarkDetailsResponse> => {
    // Get authenticated user
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }
    const userId = auth.userID; // UUID from Supabase JWT

    // Fetch the bookmark
    const bookmark = await bookmarkRepo.findById(req.id, userId);

    if (!bookmark) {
      throw APIError.notFound(`Bookmark with id ${req.id} not found`);
    }

    // Fetch transcription if it exists (only relevant for audio bookmarks)
    const transcription = await transcriptionRepo.findByBookmarkId(req.id);
    const webContent = await webContentRepo.findByBookmarkId(req.id);

    log.info("Fetched bookmark details", {
      bookmarkId: req.id,
      source: bookmark.source,
      hasTranscription: !!transcription,
    });

    return {
      bookmark,
      transcription: transcription ? toTranscriptionDetails(transcription) : null,
      webContent,
    };
  }
);

// ============================================
// Daily Digest Endpoints
// ============================================

// GENERATE DAILY DIGEST - Generate or retrieve daily digest for a date
// (Used for manual triggering with optional date parameter)
export const generateDailyDigest = api(
  { expose: true, method: "POST", path: "/digests/generate", auth: true },
  async (req?: GenerateDailyDigestRequest): Promise<GenerateDailyDigestResponse> => {
    // Get authenticated user
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }
    const userId = auth.userID; // UUID from Supabase JWT

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
      userId,
    });

    try {
      const digest = await dailyDigestService.generateDailyDigest({
        date: digestDate,
        userId,
        forceRegenerate: req?.forceRegenerate ?? false,
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
  { expose: true, method: "GET", path: "/digests/:date", auth: true },
  async (req: GetDailyDigestRequest): Promise<GetDailyDigestResponse> => {
    // Get authenticated user
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }
    const userId = auth.userID; // UUID from Supabase JWT

    let digestDate: Date;

    try {
      digestDate = parseDigestDate(req.date);
    } catch (error) {
      throw APIError.invalidArgument("Invalid date format. Use YYYY-MM-DD");
    }

    log.info("Fetching daily digest", {
      digestDate: req.date,
      userId,
    });

    const digest = await dailyDigestService.getDigestByDate(
      digestDate,
      userId
    );

    if (!digest) {
      log.info("Daily digest not found", {
        digestDate: req.date,
        userId,
      });
    }

    return { digest };
  }
);

// LIST DAILY DIGESTS - List all digests with pagination
export const listDailyDigests = api(
  { expose: true, method: "GET", path: "/digests", auth: true },
  async (req: ListDailyDigestsRequest): Promise<ListDailyDigestsResponse> => {
    // Get authenticated user
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }
    const userId = auth.userID; // UUID from Supabase JWT

    const limit = req.limit || 30;
    const offset = req.offset || 0;

    log.info("Listing daily digests", {
      limit,
      offset,
      userId,
    });

    const { digests, total } = await dailyDigestService.listDigests({
      limit,
      offset,
      userId,
    });

    return { digests, total };
  }
);

// CRON JOB ENDPOINT - Generate yesterday's digest for ALL users
// This endpoint is called by the daily cron job at 9 PM GMT
export const generateYesterdaysDigest = api(
  { expose: false, method: "POST", path: "/digests/generate-yesterday" },
  async (): Promise<GenerateDailyDigestResponse> => {
    // Generate digest for yesterday (default behavior)
    const { digestDate } = getDigestDateRange();
    const digestDateStr = digestDate.toISOString().split("T")[0];

    log.info("Cron job triggered: Generating yesterday's digest for all users", {
      digestDate: digestDateStr,
    });

    try {
      // Import users service client for service-to-service call
      const { users } = await import("~encore/clients");

      // Fetch all user IDs
      const { userIds } = await users.getUserIds();

      log.info("Fetched users for digest generation", {
        digestDate: digestDateStr,
        userCount: userIds.length,
      });

      // Track results
      const results = {
        total: userIds.length,
        successful: 0,
        failed: 0,
        errors: [] as Array<{ userId: string; error: string }>,
      };

      // Generate digest for each user
      for (const userId of userIds) {
        try {
          await dailyDigestService.generateDailyDigest({
            date: digestDate,
            userId,
            forceRegenerate: false,
          });

          results.successful++;

          log.info("Generated digest for user", {
            userId,
            digestDate: digestDateStr,
          });
        } catch (error) {
          results.failed++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          results.errors.push({ userId, error: errorMessage });

          log.error(error, "Failed to generate digest for user", {
            userId,
            digestDate: digestDateStr,
            errorMessage,
          });

          // Continue processing other users even if one fails
        }
      }

      // Log summary
      log.info("Cron job completed: Daily digest generation summary", {
        digestDate: digestDateStr,
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        successRate: `${((results.successful / results.total) * 100).toFixed(1)}%`,
      });

      // If all failed, throw error
      if (results.failed === results.total && results.total > 0) {
        throw new Error(
          `All ${results.total} digest generation attempts failed`
        );
      }

      // Return summary as digest (using the first user's digest if available, or a summary)
      // Note: This is a cron job, so the return value is mainly for logging
      const firstUserId = userIds[0];
      const digest = firstUserId
        ? await dailyDigestService.getDigestByDate(digestDate, firstUserId)
        : null;

      return {
        digest: digest || ({} as any), // Placeholder for cron job response
        message: `Cron job completed: Generated ${results.successful}/${results.total} digests successfully`,
      };
    } catch (error) {
      log.error(error, "Cron job failed to generate yesterday's digest", {
        digestDate: digestDateStr,
      });

      throw APIError.internal(
        `Failed to generate yesterday's digest: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);
