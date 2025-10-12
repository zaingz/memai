import OpenAI from "openai";
import log from "encore.dev/log";
import { OPENAI_CONFIG } from "../config/transcription.config";
import { DAILY_DIGEST_CONFIG } from "../config/daily-digest.config";

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
   * @param customInstructions - Custom prompt instructions (optional, defaults to config)
   * @returns Summary text
   * @throws Error if summarization fails
   */
  async generateSummary(transcript: string, customInstructions?: string): Promise<string> {
    const instructions = customInstructions || OPENAI_CONFIG.instructions;

    log.info("Generating summary with OpenAI Responses API", {
      transcriptLength: transcript.length,
      usingCustomInstructions: !!customInstructions,
    });

    try {
      const response = await this.client.responses.create({
        model: OPENAI_CONFIG.model,
        instructions,
        input: `Please provide a concise summary:\n\n${transcript}`,
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

  /**
   * Generates a daily digest from prompt and content
   * Used for Tier 1 (simple concatenation) and Tier 2 (reduce phase)
   * @param prompt - The formatted prompt with instructions
   * @param content - The content to process (summaries or intermediate text)
   * @param maxTokens - Custom max output tokens (optional, defaults to config)
   * @returns Digest text
   * @throws Error if generation fails
   */
  async generateDigest(prompt: string, content: string, maxTokens?: number): Promise<string> {
    const tokensToUse = maxTokens ?? DAILY_DIGEST_CONFIG.maxTokens;

    log.info("Generating daily digest with OpenAI Responses API", {
      promptLength: prompt.length,
      contentLength: content.length,
      maxTokens: tokensToUse,
    });

    try {
      const response = await this.client.responses.create({
        model: DAILY_DIGEST_CONFIG.openaiModel,
        instructions: prompt,
        input: content,
        temperature: DAILY_DIGEST_CONFIG.temperature,
        max_output_tokens: tokensToUse,
      });

      const digest = response.output_text || "No digest generated";

      log.info("Daily digest generated successfully", {
        digestLength: digest.length,
      });

      return digest;
    } catch (error) {
      log.error(error, "Failed to generate daily digest with OpenAI");
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
