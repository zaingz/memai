/**
 * API Test Factory
 *
 * Provides helper functions to create test requests, auth contexts, and mock data.
 * Reduces ~50% of test setup boilerplate across API tests.
 *
 * Key Benefits:
 * - Consistent auth setup across all tests
 * - Standardized request building
 * - Less duplication, more maintainable tests
 *
 * Usage:
 * ```typescript
 * // Before (manual setup):
 * const authOpts = {
 *   authData: {
 *     userID: userId,
 *     email: "test@example.com",
 *     role: UserRole.USER,
 *   },
 * };
 *
 * // After (using factory):
 * const authOpts = createAuthOpts(userId, "test@example.com");
 * ```
 */

import { BookmarkSource } from "../../bookmarks/types/domain.types";
import type { CallOpts } from "encore.dev/api";

/**
 * Create auth options for test client calls
 *
 * @param userId - User UUID
 * @param email - User email
 * @returns CallOpts with auth data for test client
 *
 * @example
 * ```typescript
 * const authOpts = createAuthOpts("user-uuid", "test@example.com");
 * const result = await usersTestClient.me(undefined, authOpts);
 * ```
 */
export function createAuthOpts(
  userId: string,
  email: string
): CallOpts {
  return {
    authData: {
      userID: userId,
      email,
    },
  };
}

/**
 * Create admin auth options
 *
 * @param userId - User UUID
 * @param email - User email
 * @returns CallOpts with auth data (admin status checked via isAdmin() function)
 *
 * @example
 * ```typescript
 * const adminOpts = createAdminAuthOpts("admin-uuid", "admin@example.com");
 * const result = await adminTestClient.listAllUsers(undefined, adminOpts);
 * ```
 */
export function createAdminAuthOpts(userId: string, email: string): CallOpts {
  return createAuthOpts(userId, email);
}

/**
 * Create mock bookmark request
 *
 * @param overrides - Optional overrides for request fields
 * @returns Bookmark creation request object
 *
 * @example
 * ```typescript
 * // Default web bookmark
 * const request = createMockBookmarkRequest();
 *
 * // YouTube bookmark
 * const ytRequest = createMockBookmarkRequest({
 *   url: "https://youtube.com/watch?v=abc123",
 *   source: BookmarkSource.YOUTUBE,
 * });
 * ```
 */
export function createMockBookmarkRequest(overrides?: {
  url?: string;
  source?: BookmarkSource;
  title?: string;
  client_time?: Date;
  metadata?: Record<string, any> | null;
}): {
  url: string;
  source: BookmarkSource;
  title?: string;
  client_time: Date;
  metadata?: Record<string, any> | null;
} {
  return {
    url: overrides?.url || "https://example.com/test",
    source: overrides?.source || BookmarkSource.WEB,
    title: overrides?.title,
    client_time: overrides?.client_time || new Date(),
    metadata: overrides?.metadata,
  };
}

/**
 * Create mock YouTube bookmark request
 *
 * @param videoId - YouTube video ID (defaults to dQw4w9WgXcQ)
 * @returns YouTube bookmark creation request
 *
 * @example
 * ```typescript
 * const ytRequest = createMockYouTubeBookmarkRequest("abc123");
 * const result = await bookmarksTestClient.create(ytRequest, authOpts);
 * ```
 */
export function createMockYouTubeBookmarkRequest(videoId: string = "dQw4w9WgXcQ"): {
  url: string;
  source: BookmarkSource;
  title: string;
  client_time: Date;
} {
  return {
    url: `https://youtube.com/watch?v=${videoId}`,
    source: BookmarkSource.YOUTUBE,
    title: `YouTube Video: ${videoId}`,
    client_time: new Date(),
  };
}

/**
 * Create mock podcast bookmark request
 *
 * @param episodeId - Podcast episode ID (optional)
 * @returns Podcast bookmark creation request
 *
 * @example
 * ```typescript
 * const podcastRequest = createMockPodcastBookmarkRequest("ep-123");
 * ```
 */
export function createMockPodcastBookmarkRequest(episodeId?: string): {
  url: string;
  source: BookmarkSource;
  title: string;
  client_time: Date;
} {
  const id = episodeId || "episode-123";
  return {
    url: `https://podcasts.example.com/episodes/${id}`,
    source: BookmarkSource.PODCAST,
    title: `Podcast Episode: ${id}`,
    client_time: new Date(),
  };
}

/**
 * Create mock digest request
 *
 * @param date - Digest date (YYYY-MM-DD format, defaults to today)
 * @returns Daily digest request object
 *
 * @example
 * ```typescript
 * const digestRequest = createMockDigestRequest("2025-01-15");
 * const result = await digestsTestClient.generate(digestRequest, authOpts);
 * ```
 */
export function createMockDigestRequest(date?: string): {
  date: string;
} {
  return {
    date: date || new Date().toISOString().split("T")[0], // YYYY-MM-DD
  };
}

/**
 * BEFORE/AFTER Examples
 *
 * This factory reduces test code from ~15 lines to ~3 lines per test.
 *
 * BEFORE (without test utilities):
 * ```typescript
 * it("should fetch bookmark", async () => {
 *   const userId = randomUUID();
 *   const email = "test@example.com";
 *
 *   // Manual auth setup (5 lines)
 *   const authOpts = {
 *     authData: {
 *       userID: userId,
 *       email: email,
 *       role: UserRole.USER,
 *     },
 *   };
 *
 *   // Manual request building (5 lines)
 *   const createReq = {
 *     url: "https://example.com",
 *     source: BookmarkSource.WEB,
 *     client_time: new Date(),
 *   };
 *
 *   // Call API
 *   const result = await bookmarksTestClient.create(createReq, authOpts);
 *
 *   // Manual cleanup
 *   afterEach(async () => {
 *     await db.exec`DELETE FROM bookmarks WHERE user_id = ${userId}`;
 *   });
 * });
 * ```
 *
 * AFTER (with test utilities - Agent 10 will apply):
 * ```typescript
 * it("should fetch bookmark", async () => {
 *   const userId = randomUUID();
 *   const authOpts = createAuthOpts(userId, "test@example.com");
 *   const createReq = createMockBookmarkRequest();
 *
 *   const result = await bookmarksTestClient.create(createReq, authOpts);
 *
 *   afterEach(async () => {
 *     await cleanupUserData(db, userId);
 *   });
 * });
 * ```
 *
 * Lines saved: 10 lines per test × 50+ tests = 500+ lines
 */
