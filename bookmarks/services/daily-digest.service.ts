import log from "encore.dev/log";
import {
  DailyDigest,
  DigestStatus,
  SourcesBreakdown,
  ProcessingMetadata,
  TranscriptionSummary,
  BookmarkSource,
  DigestGenerationOptions,
} from "../types";
import { DailyDigestRepository } from "../repositories/daily-digest.repository";
import {
  DAILY_DIGEST_CONFIG,
  getDigestDateRange,
  formatDigestDate,
} from "../config/daily-digest.config";

/**
 * Service for daily digest generation and management
 * Orchestrates adaptive 3-tier summarization strategy based on volume
 */
export class DailyDigestService {
  constructor(private readonly digestRepo: DailyDigestRepository) {}

  /**
   * Main orchestration method for generating a daily digest
   * @param options - Configuration for digest generation
   * @returns Generated daily digest
   */
  async generateDailyDigest(options: DigestGenerationOptions): Promise<DailyDigest> {
    const { date, userId, forceRegenerate } = options;
    const digestDateStr = formatDigestDate(date);

    log.info("Starting daily digest generation", {
      digestDate: digestDateStr,
      userId: userId || "global",
      forceRegenerate,
    });

    try {
      // Step 1: Check if digest already exists
      const existingDigest = await this.checkIfDigestExists(date, userId);

      if (existingDigest && !forceRegenerate) {
        if (existingDigest.status === DigestStatus.COMPLETED) {
          log.info("Digest already exists and is completed, returning existing", {
            digestId: existingDigest.id,
            digestDate: digestDateStr,
          });
          return existingDigest;
        }

        if (existingDigest.status === DigestStatus.PROCESSING) {
          log.warn("Digest is currently being processed, returning existing", {
            digestId: existingDigest.id,
            digestDate: digestDateStr,
          });
          return existingDigest;
        }

        // If failed or pending, we'll regenerate
        log.info("Existing digest found but not completed, regenerating", {
          digestId: existingDigest.id,
          status: existingDigest.status,
        });
      }

      // Step 2: Calculate date range for transcriptions
      const { startDate, endDate } = this.calculateDateRange(date);

      log.info("Calculated date range for digest", {
        digestDate: digestDateStr,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Step 3: Fetch completed transcriptions
      const transcriptions = await this.fetchTranscriptionsForDate(
        startDate,
        endDate,
        userId
      );

      log.info("Fetched transcriptions for digest", {
        digestDate: digestDateStr,
        transcriptionCount: transcriptions.length,
      });

      // Step 4: Calculate metadata
      const bookmarkCount = transcriptions.length;
      const sourcesBreakdown = this.calculateSourcesBreakdown(transcriptions);
      const totalDuration = this.calculateTotalDuration(transcriptions);

      log.info("Calculated digest metadata", {
        digestDate: digestDateStr,
        bookmarkCount,
        sourcesBreakdown,
        totalDuration,
      });

      // Step 5: Create or update digest record
      let digest: DailyDigest;

      if (existingDigest) {
        // Update existing digest
        await this.digestRepo.markAsProcessing(existingDigest.id);
        digest = existingDigest;
      } else {
        // Create new digest
        digest = await this.digestRepo.create({
          digest_date: date,
          user_id: userId || null,
          bookmark_count: bookmarkCount,
          sources_breakdown: sourcesBreakdown,
          date_range_start: startDate,
          date_range_end: endDate,
        });
      }

      log.info("Created/updated digest record", {
        digestId: digest.id,
        digestDate: digestDateStr,
        status: "processing",
      });

      // Step 6: Generate unified summary using map-reduce
      const startTime = Date.now();
      const digestContent = await this.generateUnifiedSummary(transcriptions);
      const processingDurationMs = Date.now() - startTime;

      // Step 7: Prepare processing metadata
      const processingMetadata: ProcessingMetadata = {
        modelUsed: DAILY_DIGEST_CONFIG.openaiModel,
        summarizationStrategy: "map-reduce",
        processingDurationMs,
      };

      // Step 8: Mark digest as completed
      await this.digestRepo.markAsCompleted(
        digest.id,
        digestContent,
        totalDuration,
        processingMetadata
      );

      log.info("Daily digest generation completed", {
        digestId: digest.id,
        digestDate: digestDateStr,
        bookmarkCount,
        totalDuration,
      });

      // Fetch and return the updated digest
      const completedDigest = await this.digestRepo.findByDate(date, userId);
      if (!completedDigest) {
        throw new Error("Failed to retrieve completed digest");
      }

      return completedDigest;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log.error(error, "Daily digest generation failed", {
        digestDate: digestDateStr,
        userId: userId || "global",
        errorMessage,
      });

      throw new Error(`Failed to generate daily digest: ${errorMessage}`);
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Checks if a digest already exists for the given date
   */
  private async checkIfDigestExists(
    date: Date,
    userId?: string
  ): Promise<DailyDigest | null> {
    return await this.digestRepo.findByDate(date, userId);
  }

  /**
   * Calculates the date range for fetching transcriptions
   */
  private calculateDateRange(date: Date): { startDate: Date; endDate: Date } {
    // Use the provided date as the digest date
    const digestDate = new Date(date);
    digestDate.setHours(0, 0, 0, 0);

    // Start of day (00:00:00)
    const startDate = new Date(digestDate);

    // End of day (23:59:59.999)
    const endDate = new Date(digestDate);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Fetches completed transcriptions for the given date range
   */
  private async fetchTranscriptionsForDate(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<TranscriptionSummary[]> {
    return await this.digestRepo.getCompletedTranscriptionsInRange(
      startDate,
      endDate,
      userId
    );
  }

  /**
   * Calculates breakdown of bookmarks by source
   */
  private calculateSourcesBreakdown(
    transcriptions: TranscriptionSummary[]
  ): SourcesBreakdown {
    const breakdown: SourcesBreakdown = {};

    for (const transcription of transcriptions) {
      const source = transcription.source;
      breakdown[source] = (breakdown[source] || 0) + 1;
    }

    return breakdown;
  }

  /**
   * Calculates total duration of all transcriptions in seconds
   */
  private calculateTotalDuration(transcriptions: TranscriptionSummary[]): number {
    return transcriptions.reduce((total, t) => total + (t.duration || 0), 0);
  }

  // ============================================
  // Summarization Methods
  // ============================================

  /**
   * Generates a unified summary from all transcriptions
   * Uses map-reduce for intelligent synthesis across any volume
   *
   * @param transcriptions - All completed transcriptions for the date
   * @returns Unified digest summary text
   */
  private async generateUnifiedSummary(
    transcriptions: TranscriptionSummary[]
  ): Promise<string | null> {
    // If no transcriptions, return null
    if (transcriptions.length === 0) {
      log.info("No transcriptions to summarize");
      return null;
    }

    log.info("Generating unified summary with map-reduce", {
      transcriptionCount: transcriptions.length,
    });

    try {
      // Import OpenAI API key from Encore secrets
      const { secret } = await import("encore.dev/config");
      const openaiApiKey = secret("OpenAIAPIKey");

      // Use MapReduceDigestService for all digests
      const { MapReduceDigestService } = await import("./map-reduce-digest.service");
      const mapReduceService = new MapReduceDigestService(openaiApiKey());

      const digest = await mapReduceService.generateDigest(transcriptions);

      log.info("Unified summary generated successfully", {
        transcriptionCount: transcriptions.length,
        digestLength: digest.length,
      });

      return digest;
    } catch (error) {
      log.error(error, "Failed to generate unified summary", {
        transcriptionCount: transcriptions.length,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // Re-throw to be handled by caller
      throw error;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Gets a digest by date
   */
  async getDigestByDate(date: Date, userId?: string): Promise<DailyDigest | null> {
    return await this.digestRepo.findByDate(date, userId);
  }

  /**
   * Lists digests with pagination
   */
  async listDigests(params: {
    limit: number;
    offset: number;
    userId?: string;
  }): Promise<{ digests: DailyDigest[]; total: number }> {
    return await this.digestRepo.list(params);
  }
}
