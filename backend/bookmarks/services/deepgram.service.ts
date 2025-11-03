import { createClient } from "@deepgram/sdk";
import log from "encore.dev/log";
import { DeepgramResponse } from "../types";
import { DEEPGRAM_CONFIG } from "../config/transcription.config";

/**
 * Service for Deepgram transcription with Audio Intelligence
 */
export class DeepgramService {
  constructor(private readonly apiKey: string) {}

  /**
   * Transcribes audio buffer using Deepgram with all Audio Intelligence features
   * @param audioBuffer - Audio file as Buffer
   * @param audioKey - Identifier for logging (e.g., bucket key or video ID)
   * @returns Deepgram response with transcription and audio intelligence data
   * @throws Error if transcription fails
   */
  async transcribe(
    audioBuffer: Buffer,
    audioKey: string
  ): Promise<DeepgramResponse> {
    const deepgram = createClient(this.apiKey);

    log.info(
      "Transcribing audio with Deepgram Nova-3 and Audio Intelligence",
      { audioKey, bufferSize: audioBuffer.length }
    );

    try {
      // Transcribe with Deepgram using latest model and audio intelligence features
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        DEEPGRAM_CONFIG
      );

      if (error) {
        throw new Error(`Deepgram API error: ${error.message}`);
      }

      // Cast to our custom type that includes audio intelligence features
      const response = result as unknown as DeepgramResponse;

      log.info("Deepgram transcription completed", {
        duration: response.metadata.duration,
        channels: response.metadata.channels,
        hasSentiment: !!response.results.sentiments,
        hasSummary: !!response.results.summary,
        hasIntents: !!response.results.intents,
        hasTopics: !!response.results.topics,
      });

      return response;
    } catch (error) {
      log.error(error, "Failed to transcribe with Deepgram", { audioKey });
      throw error;
    }
  }
}
