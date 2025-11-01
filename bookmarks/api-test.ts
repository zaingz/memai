import { api } from "encore.dev/api";
import log from "encore.dev/log";
import { db } from "./db";
import { BookmarkRepository } from "./repositories/bookmark.repository";
import { bookmarkCreatedTopic } from "./events/bookmark-created.events";
import { BookmarkSource } from "./types";
import { DailyDigestRepository } from "./repositories/daily-digest.repository";
import { DailyDigestService } from "./services/daily-digest.service";
import { DailyDigest } from "./types/daily-digest.types";

/**
 * TEST ENDPOINT - FOR DEVELOPMENT ONLY
 *
 * This endpoint bypasses authentication for local testing purposes.
 * DO NOT expose this in production!
 */

const bookmarkRepo = new BookmarkRepository(db);
const dailyDigestRepo = new DailyDigestRepository(db);
const dailyDigestService = new DailyDigestService(dailyDigestRepo);

export interface CreateBookmarkTestRequest {
  url: string;
  source?: BookmarkSource;
  title?: string;
  userId?: string; // Optional test user ID
}

export interface CreateBookmarkTestResponse {
  bookmarkId: number;
  url: string;
  source: string;
  message: string;
}

/**
 * CREATE BOOKMARK (TEST) - No auth required
 * For local development and E2E testing only
 */
export const createTest = api(
  { expose: true, method: "POST", path: "/test/bookmarks", auth: false },
  async (req: CreateBookmarkTestRequest): Promise<CreateBookmarkTestResponse> => {
    log.info("TEST: Creating bookmark without auth", {
      url: req.url,
      source: req.source,
    });

    // Use test user ID or default
    const userId = req.userId || "550e8400-e29b-41d4-a716-446655440000";
    const source = req.source || BookmarkSource.WEB;

    // Create the bookmark
    const bookmark = await bookmarkRepo.create({
      user_id: userId,
      url: req.url,
      title: req.title || null,
      source,
      client_time: new Date(),
      metadata: null,
    });

    log.info("TEST: Bookmark created, publishing event", {
      bookmarkId: bookmark.id,
      url: bookmark.url,
      source: bookmark.source,
    });

    // Publish event to trigger processing pipeline
    await bookmarkCreatedTopic.publish({
      bookmarkId: bookmark.id,
      url: bookmark.url,
      source: bookmark.source,
      title: bookmark.title || undefined,
    });

    return {
      bookmarkId: bookmark.id,
      url: bookmark.url,
      source: bookmark.source,
      message: "Bookmark created and event published. Processing pipeline started.",
    };
  }
);

export interface GenerateDigestTestRequest {
  date?: string; // YYYY-MM-DD format
  userId?: string;
}

export interface GenerateDigestTestResponse {
  digest: DailyDigest;
  message: string;
}

/**
 * GENERATE DAILY DIGEST (TEST) - No auth required
 * For local development and E2E testing only
 */
export const generateDigestTest = api(
  { expose: true, method: "POST", path: "/test/digests/generate", auth: false },
  async (req: GenerateDigestTestRequest): Promise<GenerateDigestTestResponse> => {
    log.info("TEST: Generating daily digest without auth", {
      date: req.date,
      userId: req.userId,
    });

    // Use test user ID or default
    const userId = req.userId || "550e8400-e29b-41d4-a716-446655440000";

    // Parse date or default to today
    const digestDate = req.date ? new Date(req.date) : new Date();

    log.info("TEST: Calling daily digest service", {
      digestDate: digestDate.toISOString().split("T")[0],
      userId,
    });

    try {
      const digest = await dailyDigestService.generateDailyDigest({
        date: digestDate,
        userId,
        forceRegenerate: false,
      });

      log.info("TEST: Daily digest generated", {
        digestId: digest.id,
        digestDate: digest.digest_date,
        bookmarkCount: digest.bookmark_count,
      });

      return {
        digest,
        message: digest.digest_content
          ? "Daily digest generated successfully"
          : "Daily digest scaffolding completed (summarization pending)",
      };
    } catch (error) {
      log.error(error, "TEST: Failed to generate daily digest", {
        digestDate: digestDate.toISOString().split("T")[0],
        userId,
      });

      throw error;
    }
  }
);
