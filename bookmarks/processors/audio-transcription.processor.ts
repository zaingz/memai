import { Subscription } from "encore.dev/pubsub";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { db } from "../db";
import { audioTranscriptionTopic } from "../events/audio-transcription.events";
import { summaryGenerationTopic } from "../events/summary-generation.events";
import { AudioTranscriptionEvent } from "../types";
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
 * Stage 2: Audio Transcription Processor
 * Transcribes audio with Deepgram and publishes to next stage
 */
async function handleAudioTranscription(event: AudioTranscriptionEvent) {
  const { bookmarkId, audioBucketKey, videoId } = event;

  try {
    log.info("Stage 2: Starting audio transcription", {
      bookmarkId,
      videoId,
      audioBucketKey,
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

    // Publish event for Stage 3: Summary Generation
    const messageId = await summaryGenerationTopic.publish({
      bookmarkId,
      transcript,
    });

    log.info("Stage 2 completed: Published summary generation event", {
      bookmarkId,
      messageId,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    log.error(error, "Stage 2 failed: Audio transcription error", {
      bookmarkId,
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

// Subscription to audio transcription events
export const audioTranscriptionSubscription = new Subscription(
  audioTranscriptionTopic,
  "audio-transcription-processor",
  {
    handler: handleAudioTranscription,
  }
);
