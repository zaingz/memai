import { SQLDatabase } from "encore.dev/storage/sqldb";
import {
  Transcription,
  TranscriptionStatus,
  TranscriptionMethod,
  DeepgramResponse,
} from "../types";

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
   * NOTE: Excludes deepgram_response JSONB field due to Encore deserialization limitation
   */
  async findByBookmarkId(bookmarkId: number): Promise<Transcription | null> {
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
