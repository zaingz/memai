import log from "encore.dev/log";
import { ChatOpenAI } from "@langchain/openai";
import { loadSummarizationChain } from "langchain/chains";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { TranscriptionSummary } from "../types/daily-digest.types";
import { DAILY_DIGEST_CONFIG } from "../config/daily-digest.config";
import {
  MAP_REDUCE_MAP_PROMPT,
  MAP_REDUCE_REDUCE_PROMPT,
  formatSummariesWithMetadata,
} from "../config/prompts.config";
import { batchSummaries, estimateTokenCount } from "../utils/token-estimator.util";

/**
 * Universal Map-Reduce Digest Service with LangChain
 * Handles any number of bookmarks (1 to 1000+) using intelligent batching
 */
export class MapReduceDigestService {
  private readonly llm: ChatOpenAI;

  constructor(openaiApiKey: string) {
    this.llm = new ChatOpenAI({
      model: DAILY_DIGEST_CONFIG.openaiModel,
      temperature: DAILY_DIGEST_CONFIG.temperature,
      maxTokens: DAILY_DIGEST_CONFIG.maxOutputTokens,
      apiKey: openaiApiKey,
    });
  }

  /**
   * Generates digest using LangChain map-reduce
   * Intelligently handles any number of transcriptions
   * @param transcriptions - Array of completed transcription summaries
   * @returns Final digest text
   */
  async generateDigest(transcriptions: TranscriptionSummary[]): Promise<string> {
    log.info("Starting map-reduce digest generation", {
      transcriptionCount: transcriptions.length,
    });

    try {
      // Step 1: Prepare summaries and convert to text
      const summaries = transcriptions.map((t) =>
        t.summary || t.deepgram_summary || "No summary available"
      );

      log.info("Prepared summaries for processing", {
        summaryCount: summaries.length,
        totalTokensEstimate: summaries.reduce(
          (sum, s) => sum + estimateTokenCount(s),
          0
        ),
      });

      // Step 2: Batch summaries based on token limits
      const batches = batchSummaries(
        summaries,
        DAILY_DIGEST_CONFIG.maxTokensPerBatch
      );

      log.info("Created batches for map phase", {
        batchCount: batches.length,
        avgBatchSize: Math.round(
          batches.reduce((sum, b) => sum + b.length, 0) / batches.length
        ),
      });

      // Step 3: Map phase - Process each batch
      const intermediateSummaries = await this.mapPhase(batches, transcriptions);

      log.info("Map phase completed", {
        intermediateCount: intermediateSummaries.length,
      });

      // Step 4: Reduce phase - Combine intermediate summaries
      const finalDigest = await this.reducePhase(intermediateSummaries);

      log.info("Map-reduce digest generation completed", {
        finalDigestLength: finalDigest.length,
      });

      return finalDigest;
    } catch (error) {
      log.error(error, "Map-reduce digest generation failed");
      throw new Error(
        `Map-reduce digest generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Map phase: Process batches of summaries in parallel
   * @param batches - Array of summary batches
   * @param transcriptions - Original transcription data for metadata
   * @returns Array of intermediate summaries
   */
  private async mapPhase(
    batches: string[][],
    transcriptions: TranscriptionSummary[]
  ): Promise<string[]> {
    log.info("Starting map phase", { batchCount: batches.length });

    const mapPromises = batches.map(async (batch, batchIndex) => {
      log.info("Processing batch", {
        batchIndex,
        batchSize: batch.length,
      });

      // Find corresponding transcription objects for metadata
      const batchTranscriptions = batch
        .map((summary) => {
          return transcriptions.find(
            (t) => t.summary === summary || t.deepgram_summary === summary
          );
        })
        .filter((t): t is TranscriptionSummary => t !== undefined);

      // Format with metadata
      const formattedBatch = formatSummariesWithMetadata(batchTranscriptions);

      // Create document for LangChain
      const doc = new Document({
        pageContent: formattedBatch,
        metadata: { batchIndex },
      });

      // Create map-reduce chain
      const chain = loadSummarizationChain(this.llm, {
        type: "map_reduce",
        combineMapPrompt: undefined, // We'll use custom reduce later
        combinePrompt: undefined,
      });

      // Process with map prompt
      const result = await this.llm.invoke(
        MAP_REDUCE_MAP_PROMPT.replace("{batch_summaries}", formattedBatch)
      );

      return result.content.toString();
    });

    return await Promise.all(mapPromises);
  }

  /**
   * Reduce phase: Combine intermediate summaries into final digest
   * @param intermediateSummaries - Array of intermediate summaries from map phase
   * @returns Final unified digest
   */
  private async reducePhase(intermediateSummaries: string[]): Promise<string> {
    log.info("Starting reduce phase", {
      intermediateCount: intermediateSummaries.length,
    });

    // If only one intermediate summary, use it directly
    if (intermediateSummaries.length === 1) {
      log.info("Single intermediate summary, using directly");
      return intermediateSummaries[0];
    }

    // Combine intermediate summaries
    const combinedText = intermediateSummaries
      .map((summary, idx) => `### Batch ${idx + 1}\n\n${summary}\n\n---\n`)
      .join("\n");

    // Build final reduce prompt
    const reducePrompt = MAP_REDUCE_REDUCE_PROMPT.replace(
      "{intermediate_summaries}",
      combinedText
    );

    // Generate final digest
    const result = await this.llm.invoke(reducePrompt);

    return result.content.toString();
  }

  /**
   * Alternative approach: Use LangChain's built-in map-reduce chain
   * This is simpler but gives less control over prompts
   */
  async generateDigestWithChain(
    transcriptions: TranscriptionSummary[]
  ): Promise<string> {
    log.info("Using LangChain built-in map-reduce chain", {
      transcriptionCount: transcriptions.length,
    });

    try {
      // Convert summaries to documents
      const docs = transcriptions.map(
        (t, idx) =>
          new Document({
            pageContent: t.summary || t.deepgram_summary || "No summary",
            metadata: {
              bookmarkId: t.bookmark_id,
              source: t.source,
              index: idx,
            },
          })
      );

      // Create map-reduce chain
      const chain = loadSummarizationChain(this.llm, {
        type: "map_reduce",
      });

      // Execute chain
      const result = await chain.invoke({
        input_documents: docs,
      });

      return result.text;
    } catch (error) {
      log.error(error, "LangChain chain execution failed");
      throw new Error(
        `LangChain map-reduce failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
