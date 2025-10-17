/**
 * Database Test Helpers
 *
 * Provides consistent database cleanup and transaction management for tests.
 * Complements database.util.ts with generic, reusable test helpers.
 *
 * Key Benefits:
 * - Consistent cleanup patterns across all tests
 * - Safe cleanup by IDs (not table-wide)
 * - Polling helpers for async processing
 * - Prevents test data leakage
 *
 * Usage:
 * ```typescript
 * afterEach(async () => {
 *   await cleanupUserData(db, testUserId);
 * });
 * ```
 */

import { SQLDatabase } from "encore.dev/storage/sqldb";

/**
 * Clean up all user-related data across all tables
 *
 * Deletes data in correct order to respect foreign key constraints:
 * 1. daily_digests
 * 2. web_contents (depends on bookmarks)
 * 3. transcriptions (depends on bookmarks)
 * 4. bookmarks
 *
 * @param db - Database instance
 * @param userId - User UUID
 *
 * @example
 * ```typescript
 * const userId = randomUUID();
 *
 * afterEach(async () => {
 *   await cleanupUserData(db, userId);
 * });
 * ```
 */
export async function cleanupUserData(
  db: SQLDatabase,
  userId: string
): Promise<void> {
  // Clean up in reverse dependency order
  await db.exec`DELETE FROM daily_digests WHERE user_id = ${userId}`;

  await db.exec`DELETE FROM web_contents WHERE bookmark_id IN (
    SELECT id FROM bookmarks WHERE user_id = ${userId}
  )`;

  await db.exec`DELETE FROM transcriptions WHERE bookmark_id IN (
    SELECT id FROM bookmarks WHERE user_id = ${userId}
  )`;

  await db.exec`DELETE FROM bookmarks WHERE user_id = ${userId}`;
}

/**
 * Wait for async processing to complete (polling helper)
 *
 * Polls a condition function until it returns true or timeout is reached.
 * Useful for testing pub/sub processors and async operations.
 *
 * @param condition - Function that returns true when processing is complete
 * @param timeoutMs - Maximum time to wait (default: 5000ms)
 * @param intervalMs - Polling interval (default: 100ms)
 *
 * @example
 * ```typescript
 * // Wait for transcription to complete
 * await waitForProcessing(
 *   async () => {
 *     const transcription = await transcriptionRepo.findByBookmarkId(bookmarkId);
 *     return transcription?.status === ProcessingStatus.COMPLETED;
 *   },
 *   5000, // 5 seconds timeout
 *   100   // check every 100ms
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Wait for digest generation
 * await waitForProcessing(
 *   async () => {
 *     const digest = await digestRepo.findByDate(digestDate, userId);
 *     return digest?.status === ProcessingStatus.COMPLETED;
 *   }
 * );
 * ```
 */
export async function waitForProcessing(
  condition: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timeout waiting for processing after ${timeoutMs}ms. ` +
      `Check if the async operation is running or if there are errors in logs.`
  );
}

/**
 * Wait for multiple conditions in parallel
 *
 * @param conditions - Array of condition functions
 * @param timeoutMs - Maximum time to wait (default: 5000ms)
 * @param intervalMs - Polling interval (default: 100ms)
 *
 * @example
 * ```typescript
 * // Wait for both transcription and web content processing
 * await waitForMultipleProcessing([
 *   async () => {
 *     const transcription = await transcriptionRepo.findByBookmarkId(bookmarkId);
 *     return transcription?.status === ProcessingStatus.COMPLETED;
 *   },
 *   async () => {
 *     const webContent = await webContentRepo.findByBookmarkId(bookmarkId);
 *     return webContent?.status === ProcessingStatus.COMPLETED;
 *   }
 * ]);
 * ```
 */
export async function waitForMultipleProcessing(
  conditions: Array<() => Promise<boolean>>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const results = await Promise.all(conditions.map((c) => c()));
    if (results.every((r) => r === true)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timeout waiting for multiple processing conditions after ${timeoutMs}ms. ` +
      `Check if async operations are running or if there are errors in logs.`
  );
}

/**
 * Clean up bookmark and all related data
 *
 * @param db - Database instance
 * @param bookmarkId - Bookmark ID
 *
 * @example
 * ```typescript
 * const bookmarkId = 123;
 *
 * afterEach(async () => {
 *   await cleanupBookmarkData(db, bookmarkId);
 * });
 * ```
 */
export async function cleanupBookmarkData(
  db: SQLDatabase,
  bookmarkId: number
): Promise<void> {
  // Clean up in reverse dependency order
  await db.exec`DELETE FROM web_contents WHERE bookmark_id = ${bookmarkId}`;
  await db.exec`DELETE FROM transcriptions WHERE bookmark_id = ${bookmarkId}`;
  await db.exec`DELETE FROM bookmarks WHERE id = ${bookmarkId}`;
}

/**
 * Clean up multiple bookmarks and all related data
 *
 * @param db - Database instance
 * @param bookmarkIds - Array of bookmark IDs
 *
 * @example
 * ```typescript
 * const bookmarkIds = [1, 2, 3];
 *
 * afterEach(async () => {
 *   await cleanupMultipleBookmarks(db, bookmarkIds);
 * });
 * ```
 */
export async function cleanupMultipleBookmarks(
  db: SQLDatabase,
  bookmarkIds: number[]
): Promise<void> {
  if (bookmarkIds.length === 0) return;

  // Clean up in reverse dependency order
  await db.exec`DELETE FROM web_contents WHERE bookmark_id = ANY(${bookmarkIds})`;
  await db.exec`DELETE FROM transcriptions WHERE bookmark_id = ANY(${bookmarkIds})`;
  await db.exec`DELETE FROM bookmarks WHERE id = ANY(${bookmarkIds})`;
}

/**
 * BEFORE/AFTER Examples
 *
 * BEFORE (inconsistent cleanup patterns):
 * ```typescript
 * // Test file A - Manual cleanup, wrong order (fails due to FK)
 * afterEach(async () => {
 *   await db.exec`DELETE FROM bookmarks WHERE user_id = ${userId}`; // Fails!
 *   await db.exec`DELETE FROM transcriptions WHERE bookmark_id IN (...)`; // Too late
 * });
 *
 * // Test file B - Manual cleanup, correct but verbose
 * afterEach(async () => {
 *   await db.exec`DELETE FROM daily_digests WHERE user_id = ${userId}`;
 *   await db.exec`DELETE FROM web_contents WHERE bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = ${userId})`;
 *   await db.exec`DELETE FROM transcriptions WHERE bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = ${userId})`;
 *   await db.exec`DELETE FROM bookmarks WHERE user_id = ${userId}`;
 * });
 *
 * // Test file C - Only some cleanup (data leakage)
 * afterEach(async () => {
 *   await db.exec`DELETE FROM bookmarks WHERE id = ${bookmarkId}`;
 *   // Forgot transcriptions and web_contents!
 * });
 * ```
 *
 * AFTER (with test utilities - Agent 10 will apply):
 * ```typescript
 * // Test file A - User cleanup (one line, correct order)
 * afterEach(async () => {
 *   await cleanupUserData(db, userId); // Handles all dependencies
 * });
 *
 * // Test file B - Bookmark cleanup
 * afterEach(async () => {
 *   await cleanupBookmarkData(db, bookmarkId); // Correct order
 * });
 *
 * // Test file C - Multiple bookmarks
 * afterEach(async () => {
 *   await cleanupMultipleBookmarks(db, bookmarkIds); // Batch cleanup
 * });
 * ```
 *
 * Benefits:
 * - Consistent cleanup order (respects FK constraints)
 * - Single source of truth for cleanup logic
 * - Easy to update if schema changes
 * - More readable and maintainable
 * - No data leakage between tests
 */
