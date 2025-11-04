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
import { audioDownloadedTopic } from "./events/audio-downloaded.events";
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

// ADMIN ENDPOINT - Re-enrich metadata for existing bookmarks
// Use this to update thumbnails and other metadata for existing bookmarks
export const reEnrichMetadata = api(
  { expose: true, method: "POST", path: "/admin/re-enrich-metadata", auth: true },
  async (req: { source?: BookmarkSource; limit?: number }): Promise<{ message: string; processed: number }> => {
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }

    const userId = auth.userID;
    const source = req.source;
    const limit = req.limit || 100;

    log.info("Re-enriching bookmark metadata", {
      userId,
      source,
      limit,
    });

    try {
      const bookmarksToEnrich: Array<{ id: number; url: string; title: string | null; source: string }> = [];

      if (source) {
        for await (const row of db.query<{ id: number; url: string; title: string | null; source: string }>`
          SELECT id, url, title, source FROM bookmarks
          WHERE user_id = ${userId} AND source = ${source}
          ORDER BY created_at DESC LIMIT ${limit}
        `) {
          bookmarksToEnrich.push(row);
        }
      } else {
        for await (const row of db.query<{ id: number; url: string; title: string | null; source: string }>`
          SELECT id, url, title, source FROM bookmarks
          WHERE user_id = ${userId}
          ORDER BY created_at DESC LIMIT ${limit}
        `) {
          bookmarksToEnrich.push(row);
        }
      }

      log.info("Found bookmarks to re-enrich", {
        count: bookmarksToEnrich.length,
        userId,
      });

      const { bookmarkSourceClassifiedTopic } = await import("./events/bookmark-source-classified.events");

      for (const bookmark of bookmarksToEnrich) {
        await bookmarkSourceClassifiedTopic.publish({
          bookmarkId: bookmark.id,
          url: bookmark.url,
          source: bookmark.source as BookmarkSource,
          title: bookmark.title || undefined,
        });

        log.info("Published metadata enrichment event", {
          bookmarkId: bookmark.id,
          source: bookmark.source,
        });
      }

      return {
        message: `Queued ${bookmarksToEnrich.length} bookmarks for metadata re-enrichment`,
        processed: bookmarksToEnrich.length,
      };
    } catch (error) {
      log.error(error, "Failed to re-enrich metadata", {
        userId,
        source,
      });

      throw APIError.internal(
        `Failed to re-enrich metadata: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

// ADMIN ENDPOINT - Fix array metadata issue
// Converts array metadata to proper object format
export const fixArrayMetadata = api(
  { expose: true, method: "POST", path: "/admin/fix-array-metadata", auth: true },
  async (): Promise<{ message: string; fixed: number }> => {
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }

    const userId = auth.userID;

    log.info("Fixing array metadata for user", { userId });

    try {
      // Fix bookmarks where metadata is an array - convert to proper object
      // Arrays are in format [null, {actualData}] - get last element (index -1)
      await db.exec`
        UPDATE bookmarks
        SET metadata = metadata->-1
        WHERE user_id = ${userId}
        AND jsonb_typeof(metadata) = 'array'
        AND metadata->-1 IS NOT NULL
        AND metadata->-1 != 'null'::jsonb
      `;

      // Count how many were fixed
      const countResult = await db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count
        FROM bookmarks
        WHERE user_id = ${userId}
        AND metadata IS NOT NULL
        AND jsonb_typeof(metadata) = 'object'
      `;

      const fixed = countResult?.count || 0;

      log.info("Fixed array metadata", {
        userId,
        fixed,
      });

      return {
        message: `Successfully fixed array metadata. You now have ${fixed} bookmarks with proper metadata.`,
        fixed,
      };
    } catch (error) {
      log.error(error, "Failed to fix array metadata", { userId });

      throw APIError.internal(
        `Failed to fix array metadata: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

// ADMIN ENDPOINT - Retry stuck podcast transcriptions
// Re-publishes audio-downloaded events for stuck transcriptions
export const retryStuckTranscriptions = api(
  { expose: true, method: "POST", path: "/admin/retry-stuck-transcriptions", auth: true },
  async (req?: { bookmarkId?: number }): Promise<{ message: string; retried: number }> => {
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }

    const userId = auth.userID;

    log.info("Retrying stuck transcriptions", { userId, specificBookmark: req?.bookmarkId });

    try {
      // Find bookmarks with stuck transcriptions (processing for > 10 minutes)
      const stuckBookmarks: Array<{ id: number; url: string; source: string }> = [];

      if (req?.bookmarkId) {
        // Specific bookmark requested
        for await (const row of db.query<{ id: number; url: string; source: string }>`
          SELECT b.id, b.url, b.source
          FROM bookmarks b
          INNER JOIN transcriptions t ON b.id = t.bookmark_id
          WHERE b.id = ${req.bookmarkId}
          AND b.user_id = ${userId}
          AND t.status = 'processing'
        `) {
          stuckBookmarks.push(row);
        }
      } else {
        // All stuck transcriptions
        for await (const row of db.query<{ id: number; url: string; source: string }>`
          SELECT b.id, b.url, b.source
          FROM bookmarks b
          INNER JOIN transcriptions t ON b.id = t.bookmark_id
          WHERE b.user_id = ${userId}
          AND t.status = 'processing'
          AND t.processing_started_at < NOW() - INTERVAL '10 minutes'
        `) {
          stuckBookmarks.push(row);
        }
      }

      if (stuckBookmarks.length === 0) {
        return {
          message: "No stuck transcriptions found",
          retried: 0,
        };
      }

      log.info("Found stuck transcriptions", {
        count: stuckBookmarks.length,
        bookmarkIds: stuckBookmarks.map(b => b.id),
      });

      // Re-publish audio-downloaded events for podcast bookmarks
      let retried = 0;
      for (const bookmark of stuckBookmarks) {
        if (bookmark.source === "podcast") {
          const audioBucketKey = `audio-${bookmark.id}-podcast.mp3`;

          // Reset transcription status to pending (UPDATE existing record)
          await db.exec`
            UPDATE transcriptions
            SET status = 'pending',
                processing_started_at = NULL,
                error_message = NULL
            WHERE bookmark_id = ${bookmark.id}
          `;

          log.info("Reset transcription to pending", { bookmarkId: bookmark.id });

          // Re-publish event
          await audioDownloadedTopic.publish({
            bookmarkId: bookmark.id,
            audioBucketKey,
            source: "podcast" as BookmarkSource,
            metadata: { episodeUrl: bookmark.url },
          });

          retried++;
          log.info("Re-published audio-downloaded event", {
            bookmarkId: bookmark.id,
            audioBucketKey,
          });
        } else {
          log.warn("Skipping non-podcast bookmark", {
            bookmarkId: bookmark.id,
            source: bookmark.source,
          });
        }
      }

      return {
        message: `Successfully retried ${retried} stuck transcription(s)`,
        retried,
      };
    } catch (error) {
      log.error(error, "Failed to retry stuck transcriptions", { userId });
      throw APIError.internal(
        `Failed to retry stuck transcriptions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);
