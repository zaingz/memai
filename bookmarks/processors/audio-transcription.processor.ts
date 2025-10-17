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
import { BaseProcessor } from "../../shared/processors/base.processor";

// Secrets
const deepgramApiKey = secret("DeepgramAPIKey");

// Initialize services
const deepgramService = new DeepgramService(deepgramApiKey());
const transcriptionRepo = new TranscriptionRepository(db);

/**
 * Audio Transcription Processor
 * Transcribes audio with Deepgram and publishes transcription event
 * Independent: Works with any audio source, uses source metadata for tracking
 */
class AudioTranscriptionProcessor extends BaseProcessor<AudioDownloadedEvent> {
  constructor(
    private readonly transcriptionRepo: TranscriptionRepository,
    private readonly deepgramService: DeepgramService
  ) {
    super("Audio Transcription Processor");
  }

  protected async processEvent(event: AudioDownloadedEvent): Promise<void> {
    const { bookmarkId, audioBucketKey, source, metadata } = event;

    try {
      this.logStep("Starting transcription", {
        bookmarkId,
        source,
        audioBucketKey,
        metadata,
      });

      // Download audio from bucket
      const audioBuffer = await audioFilesBucket.download(audioBucketKey);
      this.logStep("Audio downloaded from bucket", {
        bookmarkId,
        audioBucketKey,
        bufferSize: audioBuffer.length,
      });

      // Transcribe with Deepgram
      const deepgramResponse = await this.deepgramService.transcribe(
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

      this.logStep("Transcription completed", {
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
      await this.transcriptionRepo.updateTranscriptionData(bookmarkId, {
        transcript,
        deepgramSummary,
        sentiment,
        sentimentScore,
        deepgramResponse,
        duration,
        confidence,
      });

      this.logStep("Transcription data stored in database", { bookmarkId });

      // Delete audio from bucket (no longer needed)
      await audioFilesBucket.remove(audioBucketKey);
      this.logStep("Audio deleted from bucket", { bookmarkId, audioBucketKey });

      // Publish audio-transcribed event
      const messageId = await audioTranscribedTopic.publish({
        bookmarkId,
        transcript,
        source,
      });

      this.logStep("Published audio-transcribed event", {
        bookmarkId,
        source,
        messageId,
      });
    } catch (error) {
      // Mark as failed
      await this.transcriptionRepo.markAsFailed(
        bookmarkId,
        `Transcription failed: ${error instanceof Error ? error.message : String(error)}`
      );

      // Try to clean up bucket object even on failure
      try {
        await audioFilesBucket.remove(audioBucketKey);
        this.logStep("Audio deleted from bucket after failure", {
          bookmarkId,
          audioBucketKey,
        });
      } catch (cleanupError) {
        log.warn(cleanupError, "Failed to delete audio from bucket", {
          bookmarkId,
          audioBucketKey,
        });
      }

      // Re-throw to let BaseProcessor handle final logging
      throw error;
    }
  }
}

// Create processor instance
const audioTranscriptionProcessor = new AudioTranscriptionProcessor(
  transcriptionRepo,
  deepgramService
);

/**
 * Legacy handler function for backward compatibility
 * Exported for testing purposes
 */
export async function handleAudioTranscription(event: AudioDownloadedEvent): Promise<void> {
  return audioTranscriptionProcessor.safeProcess(event);
}

/**
 * Subscription to audio-downloaded topic
 * Processes audio files with Deepgram transcription
 */
export const audioTranscriptionSubscription = new Subscription(
  audioDownloadedTopic,
  "audio-transcription-processor",
  {
    handler: (event) => audioTranscriptionProcessor.safeProcess(event),
  }
);
