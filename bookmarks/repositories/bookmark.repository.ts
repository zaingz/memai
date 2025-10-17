import { SQLDatabase } from "encore.dev/storage/sqldb";
import { Bookmark, BookmarkSource } from "../types";
import { BaseRepository } from "../../shared/repositories/base.repository";

/**
 * Repository for bookmark database operations
 */
export class BookmarkRepository extends BaseRepository<Bookmark> {
  constructor(db: SQLDatabase) {
    super(db);
  }

  /**
   * Creates a new bookmark
   */
  async create(data: {
    user_id: string; // UUID from Supabase
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
        ${data.metadata}
      )
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to create bookmark");
    }

    return row;
  }

  /**
   * Implementation of abstract method: Find bookmark by ID with user ownership check
   */
  protected async findByIdQuery(
    id: number,
    userId: string
  ): Promise<Bookmark | null> {
    const row = await this.db.queryRow<Bookmark>`
      SELECT * FROM bookmarks WHERE id = ${id} AND user_id = ${userId}
    `;
    return row || null;
  }

  /**
   * Lists bookmarks with pagination and optional filtering (filtered by user_id)
   */
  async list(params: {
    userId: string;
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
    userId: string,
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

    // Determine which fields to update (use existing if not provided)
    const urlToUse = data.url !== undefined ? data.url : existing.url;
    const titleToUse = data.title !== undefined ? data.title : existing.title;
    const sourceToUse = data.source !== undefined ? data.source : existing.source;
    const metadataToUse = data.metadata !== undefined ? data.metadata : existing.metadata;

    // Update with new values or keep existing
    const row = await this.db.queryRow<Bookmark>`
      UPDATE bookmarks
      SET
        url = ${urlToUse},
        title = ${titleToUse},
        source = ${sourceToUse},
        metadata = ${metadataToUse}
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
   * Used by classification processor to update detected source (internal operation)
   * NOTE: This is an internal method called by processors, so it doesn't require userId filtering
   */
  async updateSource(id: number, source: BookmarkSource): Promise<void> {
    // Direct update without user check (internal operation)
    const result = await this.db.queryRow<{ id: number }>`
      UPDATE bookmarks
      SET source = ${source}
      WHERE id = ${id}
      RETURNING id
    `;

    if (!result) {
      throw new Error(`Bookmark with id ${id} not found`);
    }
  }

  /**
   * Implementation of abstract method: Delete bookmark with user ownership check
   */
  protected async deleteQuery(id: number, userId: string): Promise<void> {
    // Check if bookmark exists for this user
    const existing = await this.findByIdQuery(id, userId);
    if (!existing) {
      throw new Error(`Bookmark with id ${id} not found for user ${userId}`);
    }

    await this.db.exec`
      DELETE FROM bookmarks WHERE id = ${id} AND user_id = ${userId}
    `;
  }
}
