import { SQLDatabase } from "encore.dev/storage/sqldb";
import { Bookmark, BookmarkSource } from "../types";

/**
 * Repository for bookmark database operations
 */
export class BookmarkRepository {
  constructor(private readonly db: SQLDatabase) {}

  /**
   * Creates a new bookmark
   */
  async create(data: {
    user_id: number;
    url: string;
    title: string | null;
    source: BookmarkSource;
    client_time: Date;
    metadata: Record<string, any> | null;
  }): Promise<Bookmark> {
    const row = await this.db.queryRow<Bookmark>`
      INSERT INTO bookmarks (user_id, url, title, source, client_time, metadata)
      VALUES (
        ${data.user_id},
        ${data.url},
        ${data.title},
        ${data.source},
        ${data.client_time},
        ${data.metadata ? JSON.stringify(data.metadata) : null}
      )
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to create bookmark");
    }

    return row;
  }

  /**
   * Finds a bookmark by ID (filtered by user_id for data isolation)
   */
  async findById(id: number, userId: number): Promise<Bookmark | null> {
    const row = await this.db.queryRow<Bookmark>`
      SELECT * FROM bookmarks WHERE id = ${id} AND user_id = ${userId}
    `;
    return row || null;
  }

  /**
   * Lists bookmarks with pagination and optional filtering (filtered by user_id)
   */
  async list(params: {
    userId: number;
    limit: number;
    offset: number;
    source?: BookmarkSource;
  }): Promise<{ bookmarks: Bookmark[]; total: number }> {
    const { userId, limit, offset, source } = params;

    let bookmarksQuery;
    let countQuery;

    if (source) {
      bookmarksQuery = this.db.query<Bookmark>`
        SELECT * FROM bookmarks
        WHERE user_id = ${userId} AND source = ${source}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      countQuery = this.db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count FROM bookmarks
        WHERE user_id = ${userId} AND source = ${source}
      `;
    } else {
      bookmarksQuery = this.db.query<Bookmark>`
        SELECT * FROM bookmarks
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      countQuery = this.db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count FROM bookmarks
        WHERE user_id = ${userId}
      `;
    }

    // Fetch bookmarks
    const bookmarks: Bookmark[] = [];
    for await (const bookmark of bookmarksQuery) {
      bookmarks.push(bookmark);
    }

    // Get total count
    const countResult = await countQuery;
    const total = countResult?.count || 0;

    return { bookmarks, total };
  }

  /**
   * Updates a bookmark (filtered by user_id)
   */
  async update(
    id: number,
    userId: number,
    data: {
      url?: string;
      title?: string;
      source?: BookmarkSource;
      metadata?: Record<string, any>;
    }
  ): Promise<Bookmark> {
    // First get the existing bookmark
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error(`Bookmark with id ${id} not found for user ${userId}`);
    }

    // Update with new values or keep existing
    const row = await this.db.queryRow<Bookmark>`
      UPDATE bookmarks
      SET
        url = ${data.url !== undefined ? data.url : existing.url},
        title = ${data.title !== undefined ? data.title : existing.title},
        source = ${data.source !== undefined ? data.source : existing.source},
        metadata = ${data.metadata !== undefined ? JSON.stringify(data.metadata) : existing.metadata}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to update bookmark");
    }

    return row;
  }

  /**
   * Updates only the source field of a bookmark
   * Used by classification processor to update detected source
   */
  async updateSource(id: number, source: BookmarkSource): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Bookmark with id ${id} not found`);
    }

    await this.db.exec`
      UPDATE bookmarks
      SET source = ${source}
      WHERE id = ${id}
    `;
  }

  /**
   * Deletes a bookmark (filtered by user_id)
   */
  async delete(id: number, userId: number): Promise<void> {
    // Check if bookmark exists for this user
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error(`Bookmark with id ${id} not found for user ${userId}`);
    }

    await this.db.exec`
      DELETE FROM bookmarks WHERE id = ${id} AND user_id = ${userId}
    `;
  }
}
