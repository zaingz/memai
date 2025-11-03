import log from "encore.dev/log";
import {
  DailyDigest,
  DigestStatus,
  SourcesBreakdown,
  ProcessingMetadata,
  TranscriptionSummary,
  BookmarkSource,
  DigestGenerationOptions,
  DigestContentItem,
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

      // Step 3: Fetch all content (audio + web)
      const contentItems = await this.fetchContentForDate(
        startDate,
        endDate,
        userId
      );

      const audioItemCount = contentItems.filter(c => c.content_type === 'audio').length;
      const articleItemCount = contentItems.filter(c => c.content_type === 'article').length;

      log.info("Fetched content for digest", {
        digestDate: digestDateStr,
        totalItems: contentItems.length,
        audioCount: audioItemCount,
        articleCount: articleItemCount,
      });

      // Step 4: Calculate metadata
      const bookmarkCount = contentItems.length;
      const sourcesBreakdown = this.calculateSourcesBreakdown(contentItems);
      const totalDuration = this.calculateTotalDuration(contentItems);

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
          digestDate: date,
          userId: userId || null,
          bookmarkCount: bookmarkCount,
          sourcesBreakdown: sourcesBreakdown,
          dateRangeStart: startDate,
          dateRangeEnd: endDate,
        });
      }

      log.info("Created/updated digest record", {
        digestId: digest.id,
        digestDate: digestDateStr,
        status: "processing",
      });

      // Step 6: Generate unified summary using map-reduce (audio + web content)
      const startTime = Date.now();
      const digestContent = await this.generateUnifiedSummary(contentItems, {
        digestDate: digestDateStr,
        totalItems: bookmarkCount,
        audioCount: audioItemCount,
        articleCount: articleItemCount,
      });
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
   * Fetches all content (audio transcriptions + web content) for the given date range
   * Returns unified DigestContentItem format
   */
  private async fetchContentForDate(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<DigestContentItem[]> {
    // Fetch audio transcriptions
    const transcriptions = await this.digestRepo.getCompletedTranscriptionsInRange(
      startDate,
      endDate,
      userId
    );

    // Fetch web content
    const webContent = await this.digestRepo.getCompletedWebContentInRange(
      startDate,
      endDate,
      userId
    );

    // Convert transcriptions to unified format
    const transcriptionItems: DigestContentItem[] = transcriptions.map(t => ({
      bookmark_id: t.bookmark_id,
      content_type: 'audio' as const,
      summary: t.summary || t.deepgram_summary || "",
      source: t.source,
      title: t.bookmark_title ?? null,
      duration: t.duration || undefined,
      sentiment: t.sentiment || undefined,
      created_at: t.created_at,
    }));

    // Combine both content types
    const allItems = [...transcriptionItems, ...webContent];

    log.info("Fetched content for digest", {
      audioCount: transcriptionItems.length,
      articleCount: webContent.length,
      totalCount: allItems.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    return allItems;
  }

  /**
   * Calculates breakdown of bookmarks by source
   * Works with unified DigestContentItem format (audio + web)
   */
  private calculateSourcesBreakdown(
    items: DigestContentItem[]
  ): SourcesBreakdown {
    const breakdown: SourcesBreakdown = {};

    for (const item of items) {
      const source = item.source;
      breakdown[source] = (breakdown[source] || 0) + 1;
    }

    return breakdown;
  }

  /**
   * Calculates total duration of all audio content in seconds
   * Web content (articles) do not have duration
   */
  private calculateTotalDuration(items: DigestContentItem[]): number {
    return items.reduce((total, item) => {
      // Only audio items have duration
      if (item.content_type === 'audio' && item.duration) {
        return total + item.duration;
      }
      return total;
    }, 0);
  }

  // ============================================
  // Summarization Methods
  // ============================================

  /**
   * Generates a unified summary from all content (audio + web)
   * Uses map-reduce for intelligent synthesis across any volume
   *
   * @param contentItems - All completed content items (audio + web) for the date
   * @returns Unified digest summary text
   */
  private async generateUnifiedSummary(
    contentItems: DigestContentItem[],
    context: {
      digestDate: string;
      totalItems: number;
      audioCount: number;
      articleCount: number;
    }
  ): Promise<string | null> {
    // If no content, return null
    if (contentItems.length === 0) {
      log.info("No content items to summarize");
      return null;
    }

    log.info("Generating unified summary with map-reduce", {
      digestDate: context.digestDate,
      contentItemCount: context.totalItems,
      audioCount: context.audioCount,
      articleCount: context.articleCount,
    });

    try {
      // Import OpenAI API key from Encore secrets
      const { secret } = await import("encore.dev/config");
      const openaiApiKey = secret("OpenAIAPIKey");

      // Use MapReduceDigestService for all digests (now handles unified content)
      const { MapReduceDigestService } = await import("./map-reduce-digest.service");
      const mapReduceService = new MapReduceDigestService(openaiApiKey());

      const digest = await mapReduceService.generateDigest(contentItems, context);

      log.info("Unified summary generated successfully", {
        digestDate: context.digestDate,
        contentItemCount: context.totalItems,
        audioCount: context.audioCount,
        articleCount: context.articleCount,
        digestLength: digest.length,
      });

      return digest;
    } catch (error) {
      log.error(error, "Failed to generate unified summary", {
        digestDate: context.digestDate,
        contentItemCount: context.totalItems,
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
