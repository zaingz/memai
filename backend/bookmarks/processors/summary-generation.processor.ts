import { Subscription } from "encore.dev/pubsub";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { db } from "../db";
import { audioTranscribedTopic } from "../events/audio-transcribed.events";
import { AudioTranscribedEvent } from "../types";
import { OpenAIService } from "../services/openai.service";
import { TranscriptionRepository } from "../repositories/transcription.repository";
import { SUMMARY_PROMPTS, DEFAULT_SUMMARY_PROMPT } from "../config/prompts.config";
import { BookmarkSource } from "../types/domain.types";

// Secrets
const openaiApiKey = secret("OpenAIAPIKey");

// Initialize services
const openaiService = new OpenAIService(openaiApiKey());
const transcriptionRepo = new TranscriptionRepository(db);

/**
 * Summary Generation Processor
 * Generates OpenAI summary with source-specific prompts
 * Independent: Uses source metadata to select appropriate prompt
 *
 * Exported for testing purposes
 */
export async function handleSummaryGeneration(event: AudioTranscribedEvent) {
  const { bookmarkId, transcript, source } = event;

  try {
    // Select source-specific prompt
    const prompt = SUMMARY_PROMPTS[source as BookmarkSource] || DEFAULT_SUMMARY_PROMPT;

    log.info("Starting summary generation", {
      bookmarkId,
      source,
      transcriptLength: transcript.length,
      usingPrompt: source,
    });

    // Generate summary using OpenAI with source-specific prompt
    const summary = await openaiService.generateSummary(transcript, prompt);

    log.info("Summary generated", {
      bookmarkId,
      source,
      summaryLength: summary.length,
    });

    // Store summary and mark as completed
    await transcriptionRepo.updateSummary(bookmarkId, summary);

    log.info("Summary generation completed, transcription marked as completed", {
      bookmarkId,
      source,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    log.error(error, "Summary generation failed", {
      bookmarkId,
      source,
      errorMessage,
    });

    // Mark as failed
    await transcriptionRepo.markAsFailed(
      bookmarkId,
      `Summary generation failed: ${errorMessage}`
    );
  }
}

// Subscription to audio-transcribed topic
export const summaryGenerationSubscription = new Subscription(
  audioTranscribedTopic,
  "summary-generation-processor",
  {
    handler: handleSummaryGeneration,
  }
);
