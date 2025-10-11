import OpenAI from "openai";
import log from "encore.dev/log";
import { OPENAI_CONFIG } from "../config/transcription.config";

/**
 * Service for OpenAI summarization using Responses API
 */
export class OpenAIService {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generates a summary of the transcript using OpenAI Responses API
   * @param transcript - The transcript text to summarize
   * @returns Summary text
   * @throws Error if summarization fails
   */
  async generateSummary(transcript: string): Promise<string> {
    log.info("Generating summary with OpenAI Responses API");

    try {
      const response = await this.client.responses.create({
        model: OPENAI_CONFIG.model,
        instructions: OPENAI_CONFIG.instructions,
        input: `Please provide a concise summary of the following video transcript:\n\n${transcript}`,
        temperature: OPENAI_CONFIG.temperature,
        max_output_tokens: OPENAI_CONFIG.maxOutputTokens,
      });

      return response.output_text || "No summary available";
    } catch (error) {
      log.error(error, "Failed to generate summary with OpenAI");
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
