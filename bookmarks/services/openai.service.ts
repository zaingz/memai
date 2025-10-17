import OpenAI from "openai";
import log from "encore.dev/log";
import { OPENAI_CONFIG } from "../config/transcription.config";
import { DAILY_DIGEST_CONFIG } from "../config/daily-digest.config";
import { BookmarkSource } from "../types/domain.types";
import { ContentType } from "../types/web-content.types";
import { SUMMARY_PROMPTS } from "../config/prompts.config";

/**
 * Service for OpenAI summarization using Responses API
 */
export class OpenAIService {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generates a summary using OpenAI Responses API
   * Supports both legacy transcript summarization and new content-type-aware summarization
   *
   * @param content - The text to summarize (transcript, article, etc.)
   * @param sourceOrInstructions - Either a BookmarkSource or custom instructions string (for backward compatibility)
   * @param options - Configuration options (for content-type-aware summarization)
   * @returns Summary text
   * @throws Error if summarization fails
   */
  async generateSummary(
    content: string,
    sourceOrInstructions?: BookmarkSource | string,
    options?: {
      maxTokens?: number;
      contentType?: ContentType;
    }
  ): Promise<string> {
    // Backward compatibility: if sourceOrInstructions is a string or undefined, treat as custom instructions
    const isLegacyMode = typeof sourceOrInstructions === "string" || sourceOrInstructions === undefined;

    const instructions = isLegacyMode
      ? (typeof sourceOrInstructions === "string" ? sourceOrInstructions : OPENAI_CONFIG.instructions)
      : this.getInstructionsForSource(
          sourceOrInstructions,
          options?.contentType || "article"
        );

    const maxTokens = options?.maxTokens || OPENAI_CONFIG.maxOutputTokens;

    log.info("Generating summary with OpenAI Responses API", {
      contentLength: content.length,
      isLegacyMode,
      source: isLegacyMode ? "custom" : sourceOrInstructions,
      contentType: options?.contentType,
      maxTokens,
    });

    try {
      // Make API call with timeout (following Gemini service pattern)
      const result = await Promise.race([
        this.client.responses.create({
          model: OPENAI_CONFIG.model,
          instructions,
          input: `Please provide a concise summary:\n\n${content}`,
          temperature: OPENAI_CONFIG.temperature,
          max_output_tokens: maxTokens,
        }),
        this.createTimeout(OPENAI_CONFIG.timeout),
      ]);

      // Check if timeout occurred
      if (result === "TIMEOUT") {
        throw new Error("OpenAI API request timed out after 30 seconds");
      }

      const summary = result.output_text || "No summary available";

      log.info("Summary generated successfully", {
        contentLength: content.length,
        summaryLength: summary.length,
        source: isLegacyMode ? "custom" : sourceOrInstructions,
        contentType: options?.contentType,
      });

      return summary;
    } catch (error) {
      log.error(error, "Failed to generate summary with OpenAI", {
        contentLength: content.length,
        source: isLegacyMode ? "custom" : sourceOrInstructions,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Gets appropriate instructions based on source and content type
   * Combines source-specific prompts with content-type-specific guidance
   */
  private getInstructionsForSource(
    source: BookmarkSource,
    contentType: ContentType
  ): string {
    // Get base instructions from source-specific prompts
    let instructions = SUMMARY_PROMPTS[source] || SUMMARY_PROMPTS[BookmarkSource.OTHER];

    // Add content-type-specific instructions
    switch (contentType) {
      case "short_post":
        instructions += "\n\nThis is a short post or social media content. Provide a very brief 1-2 sentence summary capturing the main point.";
        break;
      case "article":
        instructions += "\n\nThis is a standard article. Provide a clear 2-3 paragraph summary highlighting the key points and takeaways.";
        break;
      case "long_form":
        instructions += "\n\nThis is long-form content. Provide a comprehensive summary with main sections, key arguments, and conclusions.";
        break;
    }

    return instructions;
  }

  /**
   * Creates a timeout promise
   * Follows the Gemini service pattern for consistent timeout handling
   */
  private createTimeout(ms: number): Promise<"TIMEOUT"> {
    return new Promise((resolve) => {
      setTimeout(() => resolve("TIMEOUT"), ms);
    });
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
    const tokensToUse = maxTokens ?? DAILY_DIGEST_CONFIG.maxOutputTokens;

    log.info("Generating daily digest with OpenAI Responses API", {
      promptLength: prompt.length,
      contentLength: content.length,
      maxTokens: tokensToUse,
    });

    try {
      // Make API call with timeout (following Gemini service pattern)
      const result = await Promise.race([
        this.client.responses.create({
          model: DAILY_DIGEST_CONFIG.openaiModel,
          instructions: prompt,
          input: content,
          temperature: DAILY_DIGEST_CONFIG.temperature,
          max_output_tokens: tokensToUse,
        }),
        this.createTimeout(OPENAI_CONFIG.timeout),
      ]);

      // Check if timeout occurred
      if (result === "TIMEOUT") {
        throw new Error("OpenAI API request timed out after 30 seconds");
      }

      const digest = result.output_text || "No digest generated";

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
