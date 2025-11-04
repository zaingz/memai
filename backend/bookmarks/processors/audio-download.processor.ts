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
import { BookmarkSource } from "../types/domain.types";
import { audioFilesBucket } from "../storage";

// Secrets
const geminiApiKey = secret("GeminiApiKey");

// Initialize services
const podcastDownloader = new PodcastDownloaderService();
const geminiService = new GeminiService(geminiApiKey());
const transcriptionRepo = new TranscriptionRepository(db);

/**
 * Unified Audio Download Processor
 * Handles audio processing for different sources:
 * - YouTube: Uses Gemini API for direct transcription (no fallback)
 * - Podcast: Downloads audio and processes with Deepgram
 *
 * Exported for testing purposes
 */
export async function handleAudioDownload(event: BookmarkSourceClassifiedEvent) {
  const { bookmarkId, source, url, title } = event;
  let audioBucketKey: string | null = null;

  try {
    log.info("Starting audio download", { bookmarkId, source, url });

    // Check if this source requires audio processing
    if (source !== BookmarkSource.YOUTUBE && source !== BookmarkSource.PODCAST) {
      log.info("Source does not require audio processing, skipping", {
        bookmarkId,
        source,
      });
      return;
    }

    // Check for duplicate processing (idempotency) with zombie detection
    const existing = await transcriptionRepo.findByBookmarkId(bookmarkId);

    if (existing && existing.status !== 'pending') {
      // Detect zombie processes: stuck in "processing" for more than 10 minutes
      const ZOMBIE_THRESHOLD_MS = 600000; // 10 minutes
      const isZombie = existing.status === 'processing' &&
                       existing.processing_started_at &&
                       (Date.now() - new Date(existing.processing_started_at).getTime()) > ZOMBIE_THRESHOLD_MS;

      if (isZombie) {
        const zombieAgeMs = existing.processing_started_at
          ? Date.now() - new Date(existing.processing_started_at).getTime()
          : 0;
        log.warn("Detected zombie transcription process, resetting to retry", {
          bookmarkId,
          status: existing.status,
          processingStartedAt: existing.processing_started_at,
          zombieAge: Math.floor(zombieAgeMs / 1000 / 60) + " minutes",
        });
        // Reset to pending to allow retry
        await transcriptionRepo.createPending(bookmarkId);
      } else {
        log.warn("Transcription already processed, skipping duplicate event", {
          bookmarkId,
          currentStatus: existing.status,
        });
        return;
      }
    }

    // Create pending transcription record if not exists
    if (!existing) {
      await transcriptionRepo.createPending(bookmarkId);
      log.info("Created pending transcription record", { bookmarkId });
    }

    // Mark as processing
    await transcriptionRepo.markAsProcessing(bookmarkId);

    // Download audio using appropriate service based on source
    let metadata: Record<string, string> = {};

    if (source === BookmarkSource.YOUTUBE) {
      // YouTube-specific processing: Gemini first, Deepgram fallback
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL: could not extract video ID");
      }

      log.info("Attempting Gemini transcription", { bookmarkId, videoId });
      const videoUrl = buildYouTubeUrl(videoId);
      const geminiResult = await geminiService.transcribeYouTubeVideo(videoUrl, videoId);

      if (geminiResult.error) {
        // Gemini failed - mark as failed (no fallback available)
        log.error("Gemini transcription failed", {
          bookmarkId,
          videoId,
          geminiError: geminiResult.error,
        });

        await transcriptionRepo.markAsFailed(
          bookmarkId,
          `Transcription failed: ${geminiResult.error}`
        );

        return; // Exit - transcription failed
      }

      // SUCCESS: Gemini worked! Store transcript
      log.info("Gemini transcription successful", {
        bookmarkId,
        videoId,
        processingTime: geminiResult.processingTime,
        transcriptLength: geminiResult.transcript.length,
      });

      // Store Gemini transcript
      await transcriptionRepo.updateGeminiTranscriptionData(bookmarkId, {
        transcript: geminiResult.transcript,
        confidence: geminiResult.confidence,
      });

      // Publish directly to audio-transcribed event (skip audio download stage)
      await audioTranscribedTopic.publish({
        bookmarkId,
        transcript: geminiResult.transcript,
        source,
      });

      log.info("Published audio-transcribed event", { bookmarkId });
      return; // Exit early - success!
    } else if (source === BookmarkSource.PODCAST) {
      // Podcast-specific download
      log.info("Downloading podcast audio", { bookmarkId, url });
      audioBucketKey = await podcastDownloader.downloadAndUpload(url, bookmarkId);
      metadata = { episodeUrl: url };
    } else {
      throw new Error(`Unsupported audio source: ${source}`);
    }

    log.info("Audio download completed", {
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

    log.info("Published audio-downloaded event", {
      bookmarkId,
      messageId,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    log.error(error, "Audio download failed", {
      bookmarkId,
      source,
      errorMessage,
    });

    // Clean up bucket object if it was uploaded but publish failed
    if (audioBucketKey) {
      try {
        await audioFilesBucket.remove(audioBucketKey);
        log.info("Cleaned up bucket object after failure", {
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
    await transcriptionRepo.markAsFailed(
      bookmarkId,
      `Audio download failed: ${errorMessage}`
    );
  }
}

/**
 * Subscription to bookmark-source-classified topic
 * Processes bookmarks that require audio download (YouTube, Podcast)
 *
 * Configuration:
 * - ackDeadline: 300s (5 minutes) to handle large podcast downloads
 *   (Default is 60s which times out for large files)
 */
export const audioDownloadSubscription = new Subscription(
  bookmarkSourceClassifiedTopic,
  "audio-download-processor",
  {
    handler: handleAudioDownload,
    ackDeadline: "300s", // 5 minutes for large podcast downloads (168MB can take 60-120s)
  }
);
