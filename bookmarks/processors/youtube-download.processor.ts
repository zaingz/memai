import { Subscription } from "encore.dev/pubsub";
import log from "encore.dev/log";
import { db } from "../db";
import { youtubeDownloadTopic } from "../events/youtube-download.events";
import { audioTranscriptionTopic } from "../events/audio-transcription.events";
import { YouTubeDownloadEvent } from "../types";
import { YouTubeDownloaderService } from "../services/youtube-downloader.service";
import { TranscriptionRepository } from "../repositories/transcription.repository";
import { extractYouTubeVideoId } from "../utils/youtube-url.util";
import { audioFilesBucket } from "../storage";

// Initialize services
const youtubeDownloader = new YouTubeDownloaderService();
const transcriptionRepo = new TranscriptionRepository(db);

/**
 * Stage 1: YouTube Download Processor
 * Downloads audio from YouTube and publishes to next stage
 */
async function handleYouTubeDownload(event: YouTubeDownloadEvent) {
  const { bookmarkId, url } = event;
  let audioBucketKey: string | null = null;

  try {
    log.info("Stage 1: Starting YouTube download", { bookmarkId, url });

    // Mark as processing
    await transcriptionRepo.markAsProcessing(bookmarkId);

    // Extract video ID
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL: could not extract video ID");
    }

    log.info("Extracted YouTube video ID", { videoId, bookmarkId });

    // Download audio and upload to bucket
    audioBucketKey = await youtubeDownloader.downloadAndUpload(
      videoId,
      bookmarkId
    );

    log.info("Audio downloaded and uploaded to bucket", {
      bookmarkId,
      videoId,
      audioBucketKey,
    });

    // Publish event for Stage 2: Audio Transcription
    const messageId = await audioTranscriptionTopic.publish({
      bookmarkId,
      audioBucketKey,
      videoId,
    });

    log.info("Stage 1 completed: Published audio transcription event", {
      bookmarkId,
      messageId,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    log.error(error, "Stage 1 failed: YouTube download error", {
      bookmarkId,
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
      `Download failed: ${errorMessage}`
    );
  }
}

// Subscription to YouTube download events
export const youtubeDownloadSubscription = new Subscription(
  youtubeDownloadTopic,
  "youtube-download-processor",
  {
    handler: handleYouTubeDownload,
  }
);
