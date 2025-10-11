import { Subscription } from "encore.dev/pubsub";
import log from "encore.dev/log";
import { db } from "../db";
import { podcastDownloadTopic } from "../events/podcast-download.events";
import { audioTranscriptionTopic } from "../events/audio-transcription.events";
import { PodcastDownloadEvent } from "../types";
import { PodcastDownloaderService } from "../services/podcast-downloader.service";
import { TranscriptionRepository } from "../repositories/transcription.repository";
import { audioFilesBucket } from "../storage";

// Initialize services
const podcastDownloader = new PodcastDownloaderService();
const transcriptionRepo = new TranscriptionRepository(db);

/**
 * Stage 1: Podcast Download Processor
 * Downloads audio from podcast episode and publishes to next stage
 * Mirrors youtube-download.processor but for podcast episodes
 */
async function handlePodcastDownload(event: PodcastDownloadEvent) {
  const { bookmarkId, url } = event;
  let audioBucketKey: string | null = null;

  try {
    log.info("Stage 1: Starting podcast download", { bookmarkId, url });

    // Mark as processing
    await transcriptionRepo.markAsProcessing(bookmarkId);

    // Download audio and upload to bucket
    audioBucketKey = await podcastDownloader.downloadAndUpload(
      url,
      bookmarkId
    );

    log.info("Audio downloaded and uploaded to bucket", {
      bookmarkId,
      audioBucketKey,
    });

    // Publish event for Stage 2: Audio Transcription (SAME topic as YouTube)
    const messageId = await audioTranscriptionTopic.publish({
      bookmarkId,
      audioBucketKey,
      videoId: url, // Reuse videoId field for source URL tracking
    });

    log.info("Stage 1 completed: Published audio transcription event", {
      bookmarkId,
      messageId,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    log.error(error, "Stage 1 failed: Podcast download error", {
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

// Subscription to podcast download events
export const podcastDownloadSubscription = new Subscription(
  podcastDownloadTopic,
  "podcast-download-processor",
  {
    handler: handlePodcastDownload,
  }
);
