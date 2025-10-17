import { Subscription } from "encore.dev/pubsub";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { db } from "../db";
import { bookmarkSourceClassifiedTopic } from "../events/bookmark-source-classified.events";
import { audioDownloadedTopic } from "../events/audio-downloaded.events";
import { audioTranscribedTopic } from "../events/audio-transcribed.events";
import { BookmarkSourceClassifiedEvent } from "../types";
import { PodcastDownloaderService } from "../services/podcast-downloader.service";
import { GeminiService } from "../services/gemini.service";
import { TranscriptionRepository } from "../repositories/transcription.repository";
import { extractYouTubeVideoId } from "../utils/youtube-url.util";
import { buildYouTubeUrl } from "../utils/youtube-url.util";
import { audioFilesBucket } from "../storage";
import { BookmarkSource } from "../types/domain.types";
import { BaseProcessor } from "../../shared/processors/base.processor";

// Secrets
const geminiApiKey = secret("GeminiApiKey");

// Initialize services
const podcastDownloader = new PodcastDownloaderService();
const geminiService = new GeminiService(geminiApiKey());
const transcriptionRepo = new TranscriptionRepository(db);

/**
 * Unified Audio Download Processor
 * Handles audio processing for different sources:
 * - YouTube: Uses Gemini API for direct transcription (no download)
 * - Podcast: Downloads audio and processes with Deepgram
 */
class AudioDownloadProcessor extends BaseProcessor<BookmarkSourceClassifiedEvent> {
  constructor(
    private readonly transcriptionRepo: TranscriptionRepository,
    private readonly geminiService: GeminiService,
    private readonly podcastDownloader: PodcastDownloaderService
  ) {
    super("Audio Download Processor");
  }

  protected async processEvent(event: BookmarkSourceClassifiedEvent): Promise<void> {
    const { bookmarkId, source, url, title } = event;
    let audioBucketKey: string | null = null;

    try {
      this.logStep("Starting audio download", { bookmarkId, source, url });

      // Check if this source requires audio processing
      if (source !== BookmarkSource.YOUTUBE && source !== BookmarkSource.PODCAST) {
        this.logStep("Source does not require audio processing, skipping", {
          bookmarkId,
          source,
        });
        return;
      }

      // Check for duplicate processing (idempotency)
      const existing = await this.transcriptionRepo.findByBookmarkIdInternal(bookmarkId);
      if (existing && existing.status !== 'pending') {
        log.warn("Transcription already processed, skipping duplicate event", {
          bookmarkId,
          currentStatus: existing.status,
        });
        return;
      }

      // Create pending transcription record if not exists
      if (!existing) {
        await this.transcriptionRepo.createPending(bookmarkId);
        this.logStep("Created pending transcription record", { bookmarkId });
      }

      // Mark as processing
      await this.transcriptionRepo.markAsProcessing(bookmarkId);

      // Download audio using appropriate service based on source
      let metadata: Record<string, string> = {};

      if (source === BookmarkSource.YOUTUBE) {
        // YouTube-specific processing with Gemini (Gemini ONLY - no fallback)
        const videoId = extractYouTubeVideoId(url);
        if (!videoId) {
          throw new Error("Invalid YouTube URL: could not extract video ID");
        }

        this.logStep("Attempting Gemini transcription", { bookmarkId, videoId });
        const videoUrl = buildYouTubeUrl(videoId);
        const geminiResult = await this.geminiService.transcribeYouTubeVideo(videoUrl, videoId);

        if (geminiResult.error) {
          // Gemini failed - mark as failed (no fallback)
          throw new Error(`Gemini transcription failed: ${geminiResult.error}`);
        }

        // SUCCESS: Gemini worked! Store transcript
        this.logStep("Gemini transcription successful", {
          bookmarkId,
          videoId,
          processingTime: geminiResult.processingTime,
          transcriptLength: geminiResult.transcript.length,
        });

        // Store Gemini transcript
        await this.transcriptionRepo.updateGeminiTranscriptionData(bookmarkId, {
          transcript: geminiResult.transcript,
          confidence: geminiResult.confidence,
        });

        // Publish directly to audio-transcribed event (skip audio download stage)
        await audioTranscribedTopic.publish({
          bookmarkId,
          transcript: geminiResult.transcript,
          source,
        });

        this.logStep("Published audio-transcribed event", { bookmarkId });
        return; // Exit early - success!
      } else if (source === BookmarkSource.PODCAST) {
        // Podcast-specific download
        this.logStep("Downloading podcast audio", { bookmarkId, url });
        audioBucketKey = await this.podcastDownloader.downloadAndUpload(url, bookmarkId);
        metadata = { episodeUrl: url };
      } else {
        throw new Error(`Unsupported audio source: ${source}`);
      }

      this.logStep("Audio download completed", {
        bookmarkId,
        source,
        audioBucketKey,
      });

      // Publish event for next stage: Audio Transcription
      const messageId = await audioDownloadedTopic.publish({
        bookmarkId,
        audioBucketKey,
        source,
        metadata,
      });

      this.logStep("Published audio-downloaded event", {
        bookmarkId,
        messageId,
      });
    } catch (error) {
      // Clean up bucket object if it was uploaded but publish failed
      if (audioBucketKey) {
        try {
          await audioFilesBucket.remove(audioBucketKey);
          this.logStep("Cleaned up bucket object after failure", {
            bookmarkId,
            audioBucketKey,
          });
        } catch (cleanupError) {
          log.warn(cleanupError, "Failed to clean up bucket object", {
            bookmarkId,
            audioBucketKey,
          });
        }
      }

      // Mark as failed
      await this.transcriptionRepo.markAsFailed(
        bookmarkId,
        error instanceof Error ? error.message : String(error)
      );

      // Re-throw to let BaseProcessor handle final logging
      throw error;
    }
  }
}

// Create processor instance
const audioDownloadProcessor = new AudioDownloadProcessor(
  transcriptionRepo,
  geminiService,
  podcastDownloader
);

/**
 * Legacy handler function for backward compatibility
 * Exported for testing purposes
 */
export async function handleAudioDownload(event: BookmarkSourceClassifiedEvent): Promise<void> {
  return audioDownloadProcessor.safeProcess(event);
}

/**
 * Subscription to bookmark-source-classified topic
 * Processes bookmarks that require audio download (YouTube, Podcast)
 */
export const audioDownloadSubscription = new Subscription(
  bookmarkSourceClassifiedTopic,
  "audio-download-processor",
  {
    handler: (event) => audioDownloadProcessor.safeProcess(event),
  }
);
