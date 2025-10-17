import { SQLDatabase } from "encore.dev/storage/sqldb";
import {
  Transcription,
  TranscriptionStatus,
  TranscriptionMethod,
  DeepgramResponse,
} from "../types";
import { BaseRepository } from "../../shared/repositories/base.repository";

/**
 * Repository for transcription database operations
 */
export class TranscriptionRepository extends BaseRepository<Transcription> {
  constructor(db: SQLDatabase) {
    super(db);
  }

  /**
   * Implementation of abstract method: Find transcription by ID with user ownership check
   * Joins with bookmarks table to verify user ownership
   */
  protected async findByIdQuery(
    id: number,
    userId: string
  ): Promise<Transcription | null> {
    const row = await this.db.queryRow<Omit<Transcription, 'deepgram_response'>>`
      SELECT
        t.id, t.bookmark_id, t.transcript, t.deepgram_summary, t.sentiment, t.sentiment_score,
        t.duration, t.confidence, t.summary, t.status, t.error_message,
        t.processing_started_at, t.processing_completed_at, t.created_at, t.updated_at
      FROM transcriptions t
      INNER JOIN bookmarks b ON t.bookmark_id = b.id
      WHERE t.id = ${id} AND b.user_id = ${userId}
    `;
    return row ? { ...row, deepgram_response: null } as Transcription : null;
  }

  /**
   * Implementation of abstract method: Delete transcription with user ownership check
   */
  protected async deleteQuery(id: number, userId: string): Promise<void> {
    const existing = await this.findByIdQuery(id, userId);
    if (!existing) {
      throw new Error(`Transcription with id ${id} not found for user ${userId}`);
    }

    await this.db.exec`
      DELETE FROM transcriptions WHERE id = ${id}
    `;
  }

  /**
   * Implementation of abstract method: Update transcription status
   */
  protected async updateStatus(
    id: number,
    status: string,
    errorMessage: string | null = null
  ): Promise<void> {
    const completedStatuses = [TranscriptionStatus.COMPLETED, TranscriptionStatus.FAILED];
    const shouldSetCompletedAt = completedStatuses.some(s => s === status);

    await this.db.exec`
      UPDATE transcriptions
      SET
        status = ${status},
        error_message = ${errorMessage},
        processing_completed_at = ${shouldSetCompletedAt ? new Date() : null}
      WHERE id = ${id}
    `;
  }

  /**
   * Creates a pending transcription record
   */
  async createPending(bookmarkId: number): Promise<void> {
    await this.db.exec`
      INSERT INTO transcriptions (bookmark_id, status)
      VALUES (${bookmarkId}, 'pending')
    `;
  }

  /**
   * Updates transcription status to processing by bookmark ID
   * Domain-specific helper method for backward compatibility
   */
  async markAsProcessingByBookmarkId(bookmarkId: number): Promise<void> {
    await this.db.exec`
      UPDATE transcriptions
      SET status = 'processing', processing_started_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  /**
   * Updates transcription status to failed with error message by bookmark ID
   * Domain-specific helper method for backward compatibility
   */
  async markAsFailedByBookmarkId(bookmarkId: number, errorMessage: string): Promise<void> {
    await this.db.exec`
      UPDATE transcriptions
      SET
        status = 'failed',
        error_message = ${errorMessage},
        processing_completed_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  /**
   * Finds a transcription by bookmark ID with user ownership verification
   * Joins with bookmarks table to ensure user owns the bookmark (defense in depth)
   * NOTE: Excludes deepgram_response JSONB field due to Encore deserialization limitation
   *
   * @param bookmarkId - Bookmark ID to find transcription for
   * @param userId - User ID to verify ownership
   * @returns Transcription if found and owned by user, null otherwise
   */
  async findByBookmarkId(bookmarkId: number, userId: string): Promise<Transcription | null> {
    const row = await this.db.queryRow<Omit<Transcription, 'deepgram_response'>>`
      SELECT
        t.id, t.bookmark_id, t.transcript, t.deepgram_summary, t.sentiment, t.sentiment_score,
        t.duration, t.confidence, t.summary, t.status, t.error_message,
        t.processing_started_at, t.processing_completed_at, t.created_at, t.updated_at
      FROM transcriptions t
      INNER JOIN bookmarks b ON t.bookmark_id = b.id
      WHERE t.bookmark_id = ${bookmarkId} AND b.user_id = ${userId}
    `;
    return row ? { ...row, deepgram_response: null } as Transcription : null;
  }

  /**
   * Finds a transcription by bookmark ID without user ownership check
   * Used for internal operations where user context is not available (e.g., processors)
   * NOTE: Excludes deepgram_response JSONB field due to Encore deserialization limitation
   *
   * @param bookmarkId - Bookmark ID to find transcription for
   * @returns Transcription if found, null otherwise
   */
  async findByBookmarkIdInternal(bookmarkId: number): Promise<Transcription | null> {
    const row = await this.db.queryRow<Omit<Transcription, 'deepgram_response'>>`
      SELECT
        id, bookmark_id, transcript, deepgram_summary, sentiment, sentiment_score,
        duration, confidence, summary, status, error_message,
        processing_started_at, processing_completed_at, created_at, updated_at
      FROM transcriptions
      WHERE bookmark_id = ${bookmarkId}
    `;
    return row ? { ...row, deepgram_response: null } as Transcription : null;
  }

  // ============================================
  // Stage-Specific Update Methods
  // ============================================

  /**
   * Stage 2: Update transcription data after Deepgram processing
   */
  async updateTranscriptionData(
    bookmarkId: number,
    data: {
      transcript: string;
      deepgramSummary: string | null;
      sentiment: "positive" | "negative" | "neutral" | null;
      sentimentScore: number | null;
      deepgramResponse: DeepgramResponse;
      duration: number;
      confidence: number;
    }
  ): Promise<void> {
    await this.db.exec`
      UPDATE transcriptions
      SET
        transcript = ${data.transcript},
        deepgram_summary = ${data.deepgramSummary},
        sentiment = ${data.sentiment},
        sentiment_score = ${data.sentimentScore},
        deepgram_response = ${data.deepgramResponse},
        duration = ${data.duration},
        confidence = ${data.confidence},
        transcription_method = 'deepgram',
        status = 'processing'
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  /**
   * Stage 3: Update summary after OpenAI processing
   */
  async updateSummary(bookmarkId: number, summary: string): Promise<void> {
    await this.db.exec`
      UPDATE transcriptions
      SET
        summary = ${summary},
        status = 'completed',
        processing_completed_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  // ============================================
  // Gemini-Specific Methods
  // ============================================

  /**
   * Stage 2 (Gemini): Update transcription data after Gemini processing
   * Simpler than Deepgram - Gemini provides just transcript, no audio intelligence
   */
  async updateGeminiTranscriptionData(
    bookmarkId: number,
    data: {
      transcript: string;
      confidence: number;
    }
  ): Promise<void> {
    await this.db.exec`
      UPDATE transcriptions
      SET
        transcript = ${data.transcript},
        confidence = ${data.confidence},
        transcription_method = 'gemini',
        status = 'processing'
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
}
