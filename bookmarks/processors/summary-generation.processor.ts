import { Subscription } from "encore.dev/pubsub";
import { secret } from "encore.dev/config";
import { db } from "../db";
import { audioTranscribedTopic } from "../events/audio-transcribed.events";
import { AudioTranscribedEvent } from "../types";
import { OpenAIService } from "../services/openai.service";
import { TranscriptionRepository } from "../repositories/transcription.repository";
import { SUMMARY_PROMPTS, DEFAULT_SUMMARY_PROMPT } from "../config/prompts.config";
import { BookmarkSource } from "../types/domain.types";
import { BaseProcessor } from "../../shared/processors/base.processor";

// Secrets
const openaiApiKey = secret("OpenAIAPIKey");

// Initialize services
const openaiService = new OpenAIService(openaiApiKey());
const transcriptionRepo = new TranscriptionRepository(db);

/**
 * Summary Generation Processor
 * Generates OpenAI summary with source-specific prompts
 * Independent: Uses source metadata to select appropriate prompt
 */
class SummaryGenerationProcessor extends BaseProcessor<AudioTranscribedEvent> {
  constructor(
    private readonly transcriptionRepo: TranscriptionRepository,
    private readonly openaiService: OpenAIService
  ) {
    super("Summary Generation Processor");
  }

  protected async processEvent(event: AudioTranscribedEvent): Promise<void> {
    const { bookmarkId, transcript, source } = event;

    try {
      // Select source-specific prompt
      const prompt = SUMMARY_PROMPTS[source as BookmarkSource] || DEFAULT_SUMMARY_PROMPT;

      this.logStep("Starting summary generation", {
        bookmarkId,
        source,
        transcriptLength: transcript.length,
        usingPrompt: source,
      });

      // Generate summary using OpenAI with source-specific prompt
      const summary = await this.openaiService.generateSummary(transcript, prompt);

      this.logStep("Summary generated", {
        bookmarkId,
        source,
        summaryLength: summary.length,
      });

      // Store summary and mark as completed
      await this.transcriptionRepo.updateSummary(bookmarkId, summary);

      this.logStep("Summary stored, transcription marked as completed", {
        bookmarkId,
        source,
      });
    } catch (error) {
      // Mark as failed
      await this.transcriptionRepo.markAsFailed(
        bookmarkId,
        `Summary generation failed: ${error instanceof Error ? error.message : String(error)}`
      );

      // Re-throw to let BaseProcessor handle final logging
      throw error;
    }
  }
}

// Create processor instance
const summaryGenerationProcessor = new SummaryGenerationProcessor(
  transcriptionRepo,
  openaiService
);

/**
 * Legacy handler function for backward compatibility
 * Exported for testing purposes
 */
export async function handleSummaryGeneration(event: AudioTranscribedEvent): Promise<void> {
  return summaryGenerationProcessor.safeProcess(event);
}

/**
 * Subscription to audio-transcribed topic
 * Processes transcripts to generate AI summaries
 */
export const summaryGenerationSubscription = new Subscription(
  audioTranscribedTopic,
  "summary-generation-processor",
  {
    handler: (event) => summaryGenerationProcessor.safeProcess(event),
  }
);
