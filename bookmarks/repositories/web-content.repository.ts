import { SQLDatabase } from "encore.dev/storage/sqldb";
import { WebContent, ContentStatus } from "../types";

/**
 * Repository for web_contents table operations
 * Follows the same pattern as TranscriptionRepository for consistency
 */
export class WebContentRepository {
  constructor(private readonly db: SQLDatabase) {}

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
      // Check if it already exists
      const existing = await this.findByBookmarkId(bookmarkId);
      if (existing) {
        return existing;
      }
      throw new Error(`Failed to create pending web content for bookmark ${bookmarkId}`);
    }

    return row;
  }

  /**
   * Marks web content as processing
   */
  async markAsProcessing(bookmarkId: number): Promise<void> {
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
   * Marks web content as completed
   */
  async markAsCompleted(bookmarkId: number): Promise<void> {
    await this.db.exec`
      UPDATE web_contents
      SET
        status = 'completed',
        processing_completed_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  /**
   * Marks web content as failed with error message
   */
  async markAsFailed(bookmarkId: number, errorMessage: string): Promise<void> {
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
   * Finds web content by bookmark ID
   */
  async findByBookmarkId(bookmarkId: number): Promise<WebContent | null> {
    return await this.db.queryRow<WebContent>`
      SELECT * FROM web_contents
      WHERE bookmark_id = ${bookmarkId}
    ` || null;
  }

  /**
   * Finds web content by ID
   */
  async findById(id: number): Promise<WebContent | null> {
    return await this.db.queryRow<WebContent>`
      SELECT * FROM web_contents
      WHERE id = ${id}
    ` || null;
  }

  /**
   * Lists all web content with pagination
   */
  async list(params: {
    limit: number;
    offset: number;
    status?: ContentStatus;
  }): Promise<WebContent[]> {
    const { limit, offset, status } = params;

    const query = status
      ? this.db.query<WebContent>`
          SELECT * FROM web_contents
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      : this.db.query<WebContent>`
          SELECT * FROM web_contents
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;

    const items: WebContent[] = [];
    for await (const item of query) {
      items.push(item);
    }

    return items;
  }
}
