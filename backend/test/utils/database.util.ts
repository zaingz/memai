/**
 * Database Utility for Testing
 *
 * Provides helper functions for database operations in tests,
 * including cleanup, seeding, and transaction management.
 *
 * Note: Encore automatically provisions test databases,
 * so we don't need to manually create/destroy databases.
 */

import { SQLDatabase } from "encore.dev/storage/sqldb";
import { User } from "../../users/types/domain.types";

/**
 * Clear all data from the users table
 * Useful for test cleanup
 *
 * @param db - Database instance
 */
export async function clearUsersTable(db: SQLDatabase): Promise<void> {
  await db.exec`DELETE FROM users`;
}

/**
 * Clear all tables in the users service
 * Useful for resetting test state between tests
 *
 * @param db - Database instance
 */
export async function clearAllUsersTables(db: SQLDatabase): Promise<void> {
  // Clear users table (only table in users service currently)
  await clearUsersTable(db);
}

/**
 * Count total users in database
 *
 * @param db - Database instance
 * @returns Number of users
 */
export async function countUsers(db: SQLDatabase): Promise<number> {
  const row = await db.queryRow<{ count: number }>`
    SELECT COUNT(*)::int as count FROM users
  `;

  return row?.count ?? 0;
}

/**
 * Check if a user exists by ID
 *
 * @param db - Database instance
 * @param userId - User UUID
 * @returns true if user exists
 */
export async function userExists(
  db: SQLDatabase,
  userId: string
): Promise<boolean> {
  const row = await db.queryRow<{ exists: boolean }>`
    SELECT EXISTS(SELECT 1 FROM users WHERE id = ${userId}) as exists
  `;

  return row?.exists ?? false;
}

/**
 * Check if a user exists by email
 *
 * @param db - Database instance
 * @param email - User email
 * @returns true if user exists
 */
export async function userExistsByEmail(
  db: SQLDatabase,
  email: string
): Promise<boolean> {
  const row = await db.queryRow<{ exists: boolean }>`
    SELECT EXISTS(SELECT 1 FROM users WHERE email = ${email}) as exists
  `;

  return row?.exists ?? false;
}

/**
 * Get user by ID
 *
 * @param db - Database instance
 * @param userId - User UUID
 * @returns User or null
 */
export async function getUserById(
  db: SQLDatabase,
  userId: string
): Promise<User | null> {
  return (
    (await db.queryRow<User>`
    SELECT * FROM users WHERE id = ${userId}
  `) || null
  );
}

/**
 * Get user by email
 *
 * @param db - Database instance
 * @param email - User email
 * @returns User or null
 */
export async function getUserByEmail(
  db: SQLDatabase,
  email: string
): Promise<User | null> {
  return (
    (await db.queryRow<User>`
    SELECT * FROM users WHERE email = ${email}
  `) || null
  );
}

/**
 * Get all users in database
 *
 * @param db - Database instance
 * @returns Array of users
 */
export async function getAllUsers(db: SQLDatabase): Promise<User[]> {
  const users: User[] = [];

  for await (const user of db.query<User>`SELECT * FROM users`) {
    users.push(user);
  }

  return users;
}

/**
 * Insert a test user directly into database
 * Bypasses API layer for faster test setup
 *
 * @param db - Database instance
 * @param user - User data
 * @returns Inserted user
 */
export async function insertTestUser(
  db: SQLDatabase,
  user: {
    id: string;
    email: string;
    name?: string | null;
    migrated_to_supabase?: boolean;
  }
): Promise<User> {
  const row = await db.queryRow<User>`
    INSERT INTO users (id, email, name, migrated_to_supabase)
    VALUES (
      ${user.id},
      ${user.email},
      ${user.name ?? null},
      ${user.migrated_to_supabase ?? true}
    )
    RETURNING *
  `;

  if (!row) {
    throw new Error("Failed to insert test user");
  }

  return row;
}

/**
 * Insert multiple test users
 *
 * @param db - Database instance
 * @param users - Array of user data
 * @returns Array of inserted users
 */
export async function insertTestUsers(
  db: SQLDatabase,
  users: Array<{
    id: string;
    email: string;
    name?: string | null;
    migrated_to_supabase?: boolean;
  }>
): Promise<User[]> {
  const insertedUsers: User[] = [];

  for (const user of users) {
    const inserted = await insertTestUser(db, user);
    insertedUsers.push(inserted);
  }

  return insertedUsers;
}

/**
 * Delete user by ID
 *
 * @param db - Database instance
 * @param userId - User UUID
 */
export async function deleteUserById(
  db: SQLDatabase,
  userId: string
): Promise<void> {
  await db.exec`DELETE FROM users WHERE id = ${userId}`;
}

/**
 * Delete users by email pattern
 * Useful for cleaning up test users
 *
 * @param db - Database instance
 * @param emailPattern - Email pattern (e.g., "test%")
 */
export async function deleteUsersByEmailPattern(
  db: SQLDatabase,
  emailPattern: string
): Promise<void> {
  await db.exec`DELETE FROM users WHERE email LIKE ${emailPattern}`;
}

/**
 * Update user updated_at timestamp to current time
 * Useful for testing timestamp changes
 *
 * @param db - Database instance
 * @param userId - User UUID
 */
export async function touchUser(
  db: SQLDatabase,
  userId: string
): Promise<void> {
  await db.exec`
    UPDATE users
    SET updated_at = NOW()
    WHERE id = ${userId}
  `;
}

// ============================================
// Bookmark Service Utilities
// ============================================

/**
 * Clear all data from the bookmarks table
 * Useful for test cleanup
 *
 * @param db - Database instance
 */
export async function clearBookmarksTable(db: SQLDatabase): Promise<void> {
  await db.exec`DELETE FROM bookmarks`;
}

/**
 * Clear all data from the transcriptions table
 * Note: Must be called before clearBookmarksTable due to foreign key constraints
 *
 * @param db - Database instance
 */
export async function clearTranscriptionsTable(
  db: SQLDatabase
): Promise<void> {
  await db.exec`DELETE FROM transcriptions`;
}

/**
 * Clear all data from the daily_digests table
 * Useful for test cleanup
 *
 * @param db - Database instance
 */
export async function clearDailyDigestsTable(db: SQLDatabase): Promise<void> {
  await db.exec`DELETE FROM daily_digests`;
}

/**
 * Clear all bookmark-related tables in correct order
 * (respects foreign key constraints)
 *
 * @param db - Database instance
 */
export async function clearAllBookmarkTables(db: SQLDatabase): Promise<void> {
  // Order matters: transcriptions depends on bookmarks
  await clearTranscriptionsTable(db);
  await clearBookmarksTable(db);
  await clearDailyDigestsTable(db);
}

/**
 * Check if a bookmark exists by ID
 *
 * @param db - Database instance
 * @param id - Bookmark ID
 * @returns true if bookmark exists
 */
export async function bookmarkExists(
  db: SQLDatabase,
  id: number
): Promise<boolean> {
  const row = await db.queryRow<{ exists: boolean }>`
    SELECT EXISTS(SELECT 1 FROM bookmarks WHERE id = ${id}) as exists
  `;

  return row?.exists ?? false;
}

/**
 * Check if a transcription exists for a bookmark
 *
 * @param db - Database instance
 * @param bookmarkId - Bookmark ID
 * @returns true if transcription exists
 */
export async function transcriptionExists(
  db: SQLDatabase,
  bookmarkId: number
): Promise<boolean> {
  const row = await db.queryRow<{ exists: boolean }>`
    SELECT EXISTS(SELECT 1 FROM transcriptions WHERE bookmark_id = ${bookmarkId}) as exists
  `;

  return row?.exists ?? false;
}

/**
 * Check if a daily digest exists for a date
 *
 * @param db - Database instance
 * @param digestDate - Digest date
 * @param userId - Optional user ID
 * @returns true if digest exists
 */
export async function dailyDigestExists(
  db: SQLDatabase,
  digestDate: Date,
  userId?: string
): Promise<boolean> {
  const userIdValue = userId !== undefined ? userId : null;
  const row = await db.queryRow<{ exists: boolean }>`
    SELECT EXISTS(
      SELECT 1 FROM daily_digests
      WHERE digest_date = ${digestDate}
        AND user_id IS NOT DISTINCT FROM ${userIdValue}
    ) as exists
  `;

  return row?.exists ?? false;
}

/**
 * Count bookmarks by user ID
 *
 * @param db - Database instance
 * @param userId - User UUID
 * @returns Number of bookmarks
 */
export async function countBookmarksByUser(
  db: SQLDatabase,
  userId: string
): Promise<number> {
  const row = await db.queryRow<{ count: number }>`
    SELECT COUNT(*)::int as count FROM bookmarks WHERE user_id = ${userId}
  `;

  return row?.count ?? 0;
}

/**
 * Count transcriptions by status
 *
 * @param db - Database instance
 * @param status - Transcription status
 * @returns Number of transcriptions
 */
export async function countTranscriptionsByStatus(
  db: SQLDatabase,
  status: string
): Promise<number> {
  const row = await db.queryRow<{ count: number }>`
    SELECT COUNT(*)::int as count FROM transcriptions WHERE status = ${status}
  `;

  return row?.count ?? 0;
}

/**
 * Count daily digests by user ID
 *
 * @param db - Database instance
 * @param userId - User UUID (or undefined for global digests)
 * @returns Number of digests
 */
export async function countDailyDigestsByUser(
  db: SQLDatabase,
  userId?: string
): Promise<number> {
  const userIdValue = userId !== undefined ? userId : null;
  const row = await db.queryRow<{ count: number }>`
    SELECT COUNT(*)::int as count FROM daily_digests
    WHERE user_id IS NOT DISTINCT FROM ${userIdValue}
  `;

  return row?.count ?? 0;
}
