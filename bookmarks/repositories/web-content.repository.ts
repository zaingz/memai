import { SQLDatabase } from "encore.dev/storage/sqldb";
import { WebContent, ContentStatus } from "../types";
import { BaseRepository } from "../../shared/repositories/base.repository";

/**
 * Repository for web_contents table operations
 * Follows the same pattern as TranscriptionRepository for consistency
 */
export class WebContentRepository extends BaseRepository<WebContent> {
  constructor(db: SQLDatabase) {
    super(db);
  }

  /**
   * Implementation of abstract method: Find web content by ID with user ownership check
   * Joins with bookmarks table to verify user ownership
   */
  protected async findByIdQuery(
    id: number,
    userId: string
  ): Promise<WebContent | null> {
    return await this.db.queryRow<WebContent>`
      SELECT wc.*
      FROM web_contents wc
      INNER JOIN bookmarks b ON wc.bookmark_id = b.id
      WHERE wc.id = ${id} AND b.user_id = ${userId}
    ` || null;
  }

  /**
   * Implementation of abstract method: Delete web content with user ownership check
   */
  protected async deleteQuery(id: number, userId: string): Promise<void> {
    const existing = await this.findByIdQuery(id, userId);
    if (!existing) {
      throw new Error(`Web content with id ${id} not found for user ${userId}`);
    }

    await this.db.exec`
      DELETE FROM web_contents WHERE id = ${id}
    `;
  }

  /**
   * Implementation of abstract method: Update web content status
   */
  protected async updateStatus(
    id: number,
    status: string,
    errorMessage: string | null = null
  ): Promise<void> {
    const completedStatuses = [ContentStatus.COMPLETED, ContentStatus.FAILED];
    const shouldSetCompletedAt = completedStatuses.some(s => s === status);

    await this.db.exec`
      UPDATE web_contents
      SET
        status = ${status},
        error_message = ${errorMessage},
        processing_completed_at = ${shouldSetCompletedAt ? new Date() : null}
      WHERE id = ${id}
    `;
  }

  /**
   * Creates a pending web content record for a bookmark
   * Uses ON CONFLICT DO NOTHING for idempotency
   */
  async createPending(bookmarkId: number): Promise<WebContent> {
    const row = await this.db.queryRow<WebContent>`
      INSERT INTO web_contents (bookmark_id, status)
      VALUES (${bookmarkId}, 'pending')
      ON CONFLICT (bookmark_id) DO NOTHING
      RETURNING *
    `;

    if (!row) {
      // Check if it already exists (internal query - no user check needed)
      const existing = await this.findByBookmarkIdInternal(bookmarkId);
      if (existing) {
        return existing;
      }
      throw new Error(`Failed to create pending web content for bookmark ${bookmarkId}`);
    }

    return row;
  }

  /**
   * Marks web content as processing by bookmark ID
   * Domain-specific helper method for backward compatibility
   */
  async markAsProcessingByBookmarkId(bookmarkId: number): Promise<void> {
    await this.db.exec`
      UPDATE web_contents
      SET
        status = 'processing',
        processing_started_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  /**
   * Updates web content with extracted data from FireCrawl
   */
  async updateContent(
    bookmarkId: number,
    data: {
      raw_markdown: string;
      raw_html: string;
      page_title: string;
      page_description: string;
      language: string;
      word_count: number;
      char_count: number;
      estimated_reading_minutes: number;
      metadata: Record<string, any>;
    }
  ): Promise<void> {
    await this.db.exec`
      UPDATE web_contents
      SET
        raw_markdown = ${data.raw_markdown},
        raw_html = ${data.raw_html},
        page_title = ${data.page_title},
        page_description = ${data.page_description},
        language = ${data.language},
        word_count = ${data.word_count},
        char_count = ${data.char_count},
        estimated_reading_minutes = ${data.estimated_reading_minutes},
        metadata = ${data.metadata}
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  /**
   * Updates the summary field (from OpenAI)
   */
  async updateSummary(bookmarkId: number, summary: string): Promise<void> {
    await this.db.exec`
      UPDATE web_contents
      SET summary = ${summary}
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  /**
   * Marks web content as completed by bookmark ID
   * Domain-specific helper method for backward compatibility
   */
  async markAsCompletedByBookmarkId(bookmarkId: number): Promise<void> {
    await this.db.exec`
      UPDATE web_contents
      SET
        status = 'completed',
        processing_completed_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  /**
   * Marks web content as failed with error message by bookmark ID
   * Domain-specific helper method for backward compatibility
   */
  async markAsFailedByBookmarkId(bookmarkId: number, errorMessage: string): Promise<void> {
    await this.db.exec`
      UPDATE web_contents
      SET
        status = 'failed',
        error_message = ${errorMessage},
        processing_completed_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  /**
   * Finds web content by bookmark ID with user ownership verification
   * Joins with bookmarks table to ensure user owns the bookmark (defense in depth)
   *
   * @param bookmarkId - Bookmark ID to find web content for
   * @param userId - User ID to verify ownership
   * @returns WebContent if found and owned by user, null otherwise
   */
  async findByBookmarkId(bookmarkId: number, userId: string): Promise<WebContent | null> {
    return await this.db.queryRow<WebContent>`
      SELECT wc.*
      FROM web_contents wc
      INNER JOIN bookmarks b ON wc.bookmark_id = b.id
      WHERE wc.bookmark_id = ${bookmarkId} AND b.user_id = ${userId}
    ` || null;
  }

  /**
   * Finds web content by bookmark ID without user ownership check
   * Used for internal operations where user context is not available (e.g., processors)
   */
  async findByBookmarkIdInternal(bookmarkId: number): Promise<WebContent | null> {
    return await this.db.queryRow<WebContent>`
      SELECT * FROM web_contents
      WHERE bookmark_id = ${bookmarkId}
    ` || null;
  }

  /**
   * Finds web content by ID without user ownership check
   * Used for internal operations where user context is not available
   */
  async findByIdInternal(id: number): Promise<WebContent | null> {
    return await this.db.queryRow<WebContent>`
      SELECT * FROM web_contents
      WHERE id = ${id}
    ` || null;
  }

  /**
   * Lists web content with pagination and user filtering
   * Joins with bookmarks table to filter by user ownership
   *
   * @param params - List parameters including userId for filtering
   * @returns Array of web content owned by the user
   */
  async list(params: {
    userId: string;
    limit: number;
    offset: number;
    status?: ContentStatus;
  }): Promise<WebContent[]> {
    const { userId, limit, offset, status } = params;

    const query = status
      ? this.db.query<WebContent>`
          SELECT wc.*
          FROM web_contents wc
          INNER JOIN bookmarks b ON wc.bookmark_id = b.id
          WHERE wc.status = ${status} AND b.user_id = ${userId}
          ORDER BY wc.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      : this.db.query<WebContent>`
          SELECT wc.*
          FROM web_contents wc
          INNER JOIN bookmarks b ON wc.bookmark_id = b.id
          WHERE b.user_id = ${userId}
          ORDER BY wc.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;

    const items: WebContent[] = [];
    for await (const item of query) {
      items.push(item);
    }

    return items;
  }
}
