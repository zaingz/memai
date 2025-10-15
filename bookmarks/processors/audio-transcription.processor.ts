import { Subscription } from "encore.dev/pubsub";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { db } from "../db";
import { audioDownloadedTopic } from "../events/audio-downloaded.events";
import { audioTranscribedTopic } from "../events/audio-transcribed.events";
import { AudioDownloadedEvent } from "../types";
import { DeepgramService } from "../services/deepgram.service";
import { TranscriptionRepository } from "../repositories/transcription.repository";
import { extractDeepgramData } from "../utils/deepgram-extractor.util";
import { audioFilesBucket } from "../storage";

// Secrets
const deepgramApiKey = secret("DeepgramAPIKey");

// Initialize services
const deepgramService = new DeepgramService(deepgramApiKey());
const transcriptionRepo = new TranscriptionRepository(db);

/**
 * Audio Transcription Processor
 * Transcribes audio with Deepgram and publishes transcription event
 * Independent: Works with any audio source, uses source metadata for tracking
 *
 * Exported for testing purposes
 */
export async function handleAudioTranscription(event: AudioDownloadedEvent) {
  const { bookmarkId, audioBucketKey, source, metadata } = event;

  try {
    log.info("Starting audio transcription", {
      bookmarkId,
      source,
      audioBucketKey,
      metadata,
    });

    // Download audio from bucket
    const audioBuffer = await audioFilesBucket.download(audioBucketKey);
    log.info("Audio downloaded from bucket", {
      bookmarkId,
      audioBucketKey,
      bufferSize: audioBuffer.length,
    });

    // Transcribe with Deepgram
    const deepgramResponse = await deepgramService.transcribe(
      audioBuffer,
      audioBucketKey
    );

    // Extract data from Deepgram response
    const {
      transcript,
      confidence,
      duration,
      sentiment,
      sentimentScore,
      deepgramSummary,
    } = extractDeepgramData(deepgramResponse);

    log.info("Transcription completed", {
      bookmarkId,
      transcriptLength: transcript.length,
      confidence,
      duration,
      sentiment,
      sentimentScore,
      hasSummary: !!deepgramSummary,
      hasIntents: !!deepgramResponse.results.intents,
      hasTopics: !!deepgramResponse.results.topics,
    });

    // Store transcription data in database
    // Note: This marks the method as 'deepgram' in the updateTranscriptionData method
    await transcriptionRepo.updateTranscriptionData(bookmarkId, {
      transcript,
      deepgramSummary,
      sentiment,
      sentimentScore,
      deepgramResponse,
      duration,
      confidence,
    });

    log.info("Transcription data stored in database", { bookmarkId });

    // Delete audio from bucket (no longer needed)
    await audioFilesBucket.remove(audioBucketKey);
    log.info("Audio deleted from bucket", { bookmarkId, audioBucketKey });

    // Publish audio-transcribed event
    const messageId = await audioTranscribedTopic.publish({
      bookmarkId,
      transcript,
      source,
    });

    log.info("Audio transcription completed, published event", {
      bookmarkId,
      source,
      messageId,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    log.error(error, "Audio transcription failed", {
      bookmarkId,
      source,
      errorMessage,
    });

    // Mark as failed
    await transcriptionRepo.markAsFailed(
      bookmarkId,
      `Transcription failed: ${errorMessage}`
    );

    // Try to clean up bucket object even on failure
    try {
      await audioFilesBucket.remove(audioBucketKey);
      log.info("Audio deleted from bucket after failure", {
        bookmarkId,
        audioBucketKey,
      });
    } catch (cleanupError) {
      log.warn(cleanupError, "Failed to delete audio from bucket", {
        bookmarkId,
        audioBucketKey,
      });
    }
  }
}

// Subscription to audio-downloaded topic
export const audioTranscriptionSubscription = new Subscription(
  audioDownloadedTopic,
  "audio-transcription-processor",
  {
    handler: handleAudioTranscription,
  }
);
