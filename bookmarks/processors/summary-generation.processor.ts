import { Subscription } from "encore.dev/pubsub";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { db } from "../db";
import { summaryGenerationTopic } from "../events/summary-generation.events";
import { SummaryGenerationEvent } from "../types";
import { OpenAIService } from "../services/openai.service";
import { TranscriptionRepository } from "../repositories/transcription.repository";

// Secrets
const openaiApiKey = secret("OpenAIAPIKey");

// Initialize services
const openaiService = new OpenAIService(openaiApiKey());
const transcriptionRepo = new TranscriptionRepository(db);

/**
 * Stage 3: Summary Generation Processor
 * Generates OpenAI summary and marks transcription as completed
 */
async function handleSummaryGeneration(event: SummaryGenerationEvent) {
  const { bookmarkId, transcript } = event;

  try {
    log.info("Stage 3: Starting summary generation", {
      bookmarkId,
      transcriptLength: transcript.length,
    });

    // Generate summary using OpenAI
    const summary = await openaiService.generateSummary(transcript);

    log.info("Summary generated", {
      bookmarkId,
      summaryLength: summary.length,
    });

    // Store summary and mark as completed
    await transcriptionRepo.updateSummary(bookmarkId, summary);

    log.info("Stage 3 completed: Summary stored and transcription marked as completed", {
      bookmarkId,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    log.error(error, "Stage 3 failed: Summary generation error", {
      bookmarkId,
      errorMessage,
    });

    // Mark as failed
    await transcriptionRepo.markAsFailed(
      bookmarkId,
      `Summary generation failed: ${errorMessage}`
    );
  }
}

// Subscription to summary generation events
export const summaryGenerationSubscription = new Subscription(
  summaryGenerationTopic,
  "summary-generation-processor",
  {
    handler: handleSummaryGeneration,
  }
);
