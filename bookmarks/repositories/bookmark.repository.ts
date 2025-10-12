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
    url: string;
    title: string | null;
    source: BookmarkSource;
    client_time: Date;
    metadata: Record<string, any> | null;
  }): Promise<Bookmark> {
    const row = await this.db.queryRow<Bookmark>`
      INSERT INTO bookmarks (url, title, source, client_time, metadata)
      VALUES (
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
   * Finds a bookmark by ID
   */
  async findById(id: number): Promise<Bookmark | null> {
    const row = await this.db.queryRow<Bookmark>`
      SELECT * FROM bookmarks WHERE id = ${id}
    `;
    return row || null;
  }

  /**
   * Lists bookmarks with pagination and optional filtering
   */
  async list(params: {
    limit: number;
    offset: number;
    source?: BookmarkSource;
  }): Promise<{ bookmarks: Bookmark[]; total: number }> {
    const { limit, offset, source } = params;

    let bookmarksQuery;
    let countQuery;

    if (source) {
      bookmarksQuery = this.db.query<Bookmark>`
        SELECT * FROM bookmarks
        WHERE source = ${source}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      countQuery = this.db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count FROM bookmarks
        WHERE source = ${source}
      `;
    } else {
      bookmarksQuery = this.db.query<Bookmark>`
        SELECT * FROM bookmarks
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      countQuery = this.db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count FROM bookmarks
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
   * Updates a bookmark
   */
  async update(
    id: number,
    data: {
      url?: string;
      title?: string;
      source?: BookmarkSource;
      metadata?: Record<string, any>;
    }
  ): Promise<Bookmark> {
    // First get the existing bookmark
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Bookmark with id ${id} not found`);
    }

    // Update with new values or keep existing
    const row = await this.db.queryRow<Bookmark>`
      UPDATE bookmarks
      SET
        url = ${data.url !== undefined ? data.url : existing.url},
        title = ${data.title !== undefined ? data.title : existing.title},
        source = ${data.source !== undefined ? data.source : existing.source},
        metadata = ${data.metadata !== undefined ? JSON.stringify(data.metadata) : existing.metadata}
      WHERE id = ${id}
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
   * Deletes a bookmark
   */
  async delete(id: number): Promise<void> {
    // Check if bookmark exists
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Bookmark with id ${id} not found`);
    }

    await this.db.exec`
      DELETE FROM bookmarks WHERE id = ${id}
    `;
  }
}
