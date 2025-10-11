import { SQLDatabase } from "encore.dev/storage/sqldb";
import { Transcription, TranscriptionStatus, DeepgramResponse } from "../types";

/**
 * Repository for transcription database operations
 */
export class TranscriptionRepository {
  constructor(private readonly db: SQLDatabase) {}

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
   * Updates transcription status to processing
   */
  async markAsProcessing(bookmarkId: number): Promise<void> {
    await this.db.exec`
      UPDATE transcriptions
      SET status = 'processing', processing_started_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }

  /**
   * Updates transcription status to failed with error message
   */
  async markAsFailed(bookmarkId: number, errorMessage: string): Promise<void> {
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
   * Finds a transcription by bookmark ID
   */
  async findByBookmarkId(bookmarkId: number): Promise<Transcription | null> {
    const row = await this.db.queryRow<Transcription>`
      SELECT * FROM transcriptions WHERE bookmark_id = ${bookmarkId}
    `;
    return row || null;
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
      deepgramResponse: any;
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
}
