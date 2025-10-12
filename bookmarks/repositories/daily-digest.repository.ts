import { SQLDatabase } from "encore.dev/storage/sqldb";
import {
  DailyDigest,
  DigestStatus,
  SourcesBreakdown,
  ProcessingMetadata,
  TranscriptionSummary,
  BookmarkSource,
} from "../types";

/**
 * Repository for daily digest database operations
 */
export class DailyDigestRepository {
  constructor(private readonly db: SQLDatabase) {}

  /**
   * Creates a new daily digest record with pending status
   */
  async create(data: {
    digestDate: Date;
    userId: number | null;
    bookmarkCount: number;
    sourcesBreakdown: SourcesBreakdown | null;
    dateRangeStart: Date;
    dateRangeEnd: Date;
  }): Promise<DailyDigest> {
    // Use queryRow with RETURNING like bookmark.repository.ts
    const row = await this.db.queryRow<DailyDigest>`
      INSERT INTO daily_digests (
        digest_date,
        user_id,
        status,
        bookmark_count,
        sources_breakdown,
        date_range_start,
        date_range_end
      )
      VALUES (
        ${data.digestDate},
        ${data.userId},
        'pending',
        ${data.bookmarkCount},
        ${data.sourcesBreakdown},
        ${data.dateRangeStart},
        ${data.dateRangeEnd}
      )
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to create daily digest");
    }

    return row;
  }

  /**
   * Finds a digest by date and optional user ID
   */
  async findByDate(digestDate: Date, userId?: number): Promise<DailyDigest | null> {
    const userIdValue = userId !== undefined ? userId : null;
    const row = await this.db.queryRow<DailyDigest>`
      SELECT * FROM daily_digests
      WHERE digest_date = ${digestDate}
        AND user_id IS NOT DISTINCT FROM ${userIdValue}
    `;
    return row || null;
  }

  /**
   * Finds digests within a date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<DailyDigest[]> {
    const userIdValue = userId !== undefined ? userId : null;
    const query = this.db.query<DailyDigest>`
      SELECT * FROM daily_digests
      WHERE digest_date >= ${startDate}
        AND digest_date <= ${endDate}
        AND user_id IS NOT DISTINCT FROM ${userIdValue}
      ORDER BY digest_date DESC
    `;

    const digests: DailyDigest[] = [];
    for await (const digest of query) {
      digests.push(digest);
    }

    return digests;
  }

  /**
   * Lists digests with pagination
   */
  async list(params: {
    limit: number;
    offset: number;
    userId?: number;
  }): Promise<{ digests: DailyDigest[]; total: number }> {
    const { limit, offset, userId } = params;
    const userIdValue = userId !== undefined ? userId : null;

    const digestsQuery = this.db.query<DailyDigest>`
      SELECT * FROM daily_digests
      WHERE user_id IS NOT DISTINCT FROM ${userIdValue}
      ORDER BY digest_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = this.db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM daily_digests
      WHERE user_id IS NOT DISTINCT FROM ${userIdValue}
    `;

    // Fetch digests
    const digests: DailyDigest[] = [];
    for await (const digest of digestsQuery) {
      digests.push(digest);
    }

    // Get total count
    const countResult = await countQuery;
    const total = countResult?.count || 0;

    return { digests, total };
  }

  /**
   * Checks if a digest exists for a given date
   */
  async existsForDate(digestDate: Date, userId?: number): Promise<boolean> {
    const userIdValue = userId !== undefined ? userId : null;
    const row = await this.db.queryRow<{ exists: boolean }>`
      SELECT EXISTS(
        SELECT 1 FROM daily_digests
        WHERE digest_date = ${digestDate}
          AND user_id IS NOT DISTINCT FROM ${userIdValue}
      ) as exists
    `;
    return row?.exists || false;
  }

  /**
   * Updates digest status
   */
  async updateStatus(
    id: number,
    status: DigestStatus,
    errorMessage?: string
  ): Promise<void> {
    await this.db.exec`
      UPDATE daily_digests
      SET
        status = ${status},
        error_message = ${errorMessage || null},
        processing_completed_at = ${status === DigestStatus.COMPLETED || status === DigestStatus.FAILED ? new Date() : null}
      WHERE id = ${id}
    `;
  }

  /**
   * Marks digest as processing
   */
  async markAsProcessing(id: number): Promise<void> {
    await this.db.exec`
      UPDATE daily_digests
      SET
        status = 'processing',
        processing_started_at = NOW()
      WHERE id = ${id}
    `;
  }

  /**
   * Marks digest as completed with content
   */
  async markAsCompleted(
    id: number,
    content: string | null,
    totalDuration: number | null,
    metadata: ProcessingMetadata
  ): Promise<void> {
    await this.db.exec`
      UPDATE daily_digests
      SET
        status = 'completed',
        digest_content = ${content},
        total_duration = ${totalDuration},
        processing_metadata = ${metadata},
        processing_completed_at = NOW()
      WHERE id = ${id}
    `;
  }

  /**
   * Marks digest as failed with error message
   */
  async markAsFailed(id: number, errorMessage: string): Promise<void> {
    await this.db.exec`
      UPDATE daily_digests
      SET
        status = 'failed',
        error_message = ${errorMessage},
        processing_completed_at = NOW()
      WHERE id = ${id}
    `;
  }

  /**
   * Updates digest content (for Phase 2 summarization)
   */
  async updateContent(
    id: number,
    content: string,
    metadata: ProcessingMetadata
  ): Promise<void> {
    await this.db.exec`
      UPDATE daily_digests
      SET
        digest_content = ${content},
        processing_metadata = ${metadata}
      WHERE id = ${id}
    `;
  }

  /**
   * Deletes a digest by ID
   */
  async delete(id: number): Promise<void> {
    const existing = await this.db.queryRow<{ id: number }>`
      SELECT id FROM daily_digests WHERE id = ${id}
    `;

    if (!existing) {
      throw new Error(`Daily digest with id ${id} not found`);
    }

    await this.db.exec`
      DELETE FROM daily_digests WHERE id = ${id}
    `;
  }

  // ============================================
  // Query Helpers for Transcriptions
  // ============================================

  /**
   * Gets completed transcriptions within a date range
   * Joins with bookmarks to get source information
   */
  async getCompletedTranscriptionsInRange(
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<TranscriptionSummary[]> {
    // For now, ignore userId since we don't have user auth yet
    // In the future, this will filter by user_id in bookmarks table
    const query = this.db.query<TranscriptionSummary>`
      SELECT
        t.bookmark_id,
        t.transcript,
        t.summary,
        t.deepgram_summary,
        t.duration::numeric::float AS duration,
        t.sentiment,
        t.created_at,
        b.source
      FROM transcriptions t
      INNER JOIN bookmarks b ON t.bookmark_id = b.id
      WHERE t.status = 'completed'
        AND t.created_at >= ${startDate}
        AND t.created_at <= ${endDate}
      ORDER BY t.created_at DESC
    `;

    const transcriptions: TranscriptionSummary[] = [];
    for await (const transcription of query) {
      transcriptions.push(transcription);
    }

    return transcriptions;
  }
}
