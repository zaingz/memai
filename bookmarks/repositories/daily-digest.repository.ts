import { SQLDatabase } from "encore.dev/storage/sqldb";
import {
  DailyDigest,
  DigestStatus,
  SourcesBreakdown,
  ProcessingMetadata,
  TranscriptionSummary,
  BookmarkSource,
  DigestContentItem,
} from "../types";

/**
 * Repository for daily digest database operations
 */
export class DailyDigestRepository {
  constructor(private readonly db: SQLDatabase) {}

  /**
   * Creates a new daily digest record with pending status
   * NOTE: Excludes JSONB fields from RETURNING due to Encore deserialization limitation
   */
  async create(data: {
    digestDate: Date;
    userId: string | null;
    bookmarkCount: number;
    sourcesBreakdown: SourcesBreakdown | null;
    dateRangeStart: Date;
    dateRangeEnd: Date;
  }): Promise<DailyDigest> {
    const row = await this.db.queryRow<Omit<DailyDigest, 'sources_breakdown' | 'processing_metadata'>>`
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
      RETURNING
        id, digest_date, user_id, status, bookmark_count,
        date_range_start, date_range_end, digest_content, total_duration,
        error_message, processing_started_at, processing_completed_at, created_at, updated_at
    `;

    if (!row) {
      throw new Error("Failed to create daily digest");
    }

    return {
      ...row,
      sources_breakdown: data.sourcesBreakdown,
      processing_metadata: null
    } as DailyDigest;
  }

  /**
   * Finds a digest by date and optional user ID
   * NOTE: Excludes JSONB fields due to Encore deserialization limitation
   */
  async findByDate(digestDate: Date, userId?: string): Promise<DailyDigest | null> {
    const userIdValue = userId !== undefined ? userId : null;
    const row = await this.db.queryRow<Omit<DailyDigest, 'sources_breakdown' | 'processing_metadata'>>`
      SELECT
        id, digest_date, user_id, status, bookmark_count,
        date_range_start, date_range_end, digest_content, total_duration,
        error_message, processing_started_at, processing_completed_at, created_at, updated_at
      FROM daily_digests
      WHERE digest_date = ${digestDate}
        AND user_id IS NOT DISTINCT FROM ${userIdValue}
    `;
    return row ? {
      ...row,
      sources_breakdown: null,
      processing_metadata: null
    } as DailyDigest : null;
  }

  /**
   * Finds digests within a date range
   * NOTE: Excludes JSONB fields due to Encore deserialization limitation
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<DailyDigest[]> {
    const userIdValue = userId !== undefined ? userId : null;
    const query = this.db.query<Omit<DailyDigest, 'sources_breakdown' | 'processing_metadata'>>`
      SELECT
        id, digest_date, user_id, status, bookmark_count,
        date_range_start, date_range_end, digest_content, total_duration,
        error_message, processing_started_at, processing_completed_at, created_at, updated_at
      FROM daily_digests
      WHERE digest_date >= ${startDate}
        AND digest_date <= ${endDate}
        AND user_id IS NOT DISTINCT FROM ${userIdValue}
      ORDER BY digest_date DESC
    `;

    const digests: DailyDigest[] = [];
    for await (const digest of query) {
      digests.push({
        ...digest,
        sources_breakdown: null,
        processing_metadata: null
      } as DailyDigest);
    }

    return digests;
  }

  /**
   * Lists digests with pagination
   * NOTE: Excludes JSONB fields due to Encore deserialization limitation
   */
  async list(params: {
    limit: number;
    offset: number;
    userId?: string;
  }): Promise<{ digests: DailyDigest[]; total: number }> {
    const { limit, offset, userId } = params;
    const userIdValue = userId !== undefined ? userId : null;

    const digestsQuery = this.db.query<Omit<DailyDigest, 'sources_breakdown' | 'processing_metadata'>>`
      SELECT
        id, digest_date, user_id, status, bookmark_count,
        date_range_start, date_range_end, digest_content, total_duration,
        error_message, processing_started_at, processing_completed_at, created_at, updated_at
      FROM daily_digests
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
      digests.push({
        ...digest,
        sources_breakdown: null,
        processing_metadata: null
      } as DailyDigest);
    }

    // Get total count
    const countResult = await countQuery;
    const total = countResult?.count || 0;

    return { digests, total };
  }

  /**
   * Checks if a digest exists for a given date
   */
  async existsForDate(digestDate: Date, userId?: string): Promise<boolean> {
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
   * CRITICAL: Filters by userId to ensure users only see their own data
   */
  async getCompletedTranscriptionsInRange(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<TranscriptionSummary[]> {
    const userIdValue = userId !== undefined ? userId : null;

    const query = this.db.query<TranscriptionSummary>`
      SELECT
        t.bookmark_id,
        t.transcript,
        t.summary,
        t.deepgram_summary,
        b.title AS bookmark_title,
        t.duration::numeric::float AS duration,
        t.sentiment,
        t.created_at,
        b.source
      FROM transcriptions t
      INNER JOIN bookmarks b ON t.bookmark_id = b.id
      WHERE t.status = 'completed'
        AND t.created_at >= ${startDate}
        AND t.created_at <= ${endDate}
        AND b.user_id IS NOT DISTINCT FROM ${userIdValue}
      ORDER BY t.created_at DESC
    `;

    const transcriptions: TranscriptionSummary[] = [];
    for await (const transcription of query) {
      transcriptions.push(transcription);
    }

    return transcriptions;
  }

  /**
   * Gets completed web content within a date range
   * Returns DigestContentItem format for unified processing
   * CRITICAL: Filters by userId to ensure users only see their own data
   */
  async getCompletedWebContentInRange(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<DigestContentItem[]> {
    const userIdValue = userId !== undefined ? userId : null;

    const query = this.db.query<DigestContentItem>`
      SELECT
        wc.bookmark_id,
        'article' as content_type,
        wc.summary,
        b.source,
        wc.page_title as title,
        wc.word_count,
        wc.estimated_reading_minutes as reading_minutes,
        wc.created_at
      FROM web_contents wc
      INNER JOIN bookmarks b ON wc.bookmark_id = b.id
      WHERE wc.status = 'completed'
        AND wc.summary IS NOT NULL
        AND wc.created_at >= ${startDate}
        AND wc.created_at <= ${endDate}
        AND b.user_id IS NOT DISTINCT FROM ${userIdValue}
      ORDER BY wc.created_at DESC
    `;

    const items: DigestContentItem[] = [];
    for await (const item of query) {
      items.push(item);
    }

    return items;
  }
}
