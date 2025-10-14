import log from "encore.dev/log";
import { ChatOpenAI } from "@langchain/openai";
import { loadSummarizationChain } from "langchain/chains";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { DigestContentItem } from "../types/web-content.types";
import { DAILY_DIGEST_CONFIG } from "../config/daily-digest.config";
import {
  MAP_REDUCE_MAP_PROMPT,
  MAP_REDUCE_REDUCE_PROMPT,
  formatSourceName,
} from "../config/prompts.config";
import { batchSummaries, estimateTokenCount } from "../utils/token-estimator.util";

/**
 * Format DigestContentItems with metadata for LLM prompts
 * Handles both audio and article content types
 */
function formatContentItemsWithMetadata(items: DigestContentItem[]): string {
  return items.map((item, idx) => {
    const sourceName = formatSourceName(item.source);
    const contentType = item.content_type === 'audio' ? '🎧 Audio' : '📄 Article';

    // Format duration for audio content
    const durationStr = item.duration
      ? ` (${Math.round(item.duration / 60)} min)`
      : '';

    // Format reading time for articles
    const readingStr = item.reading_minutes
      ? ` (${item.reading_minutes} min read)`
      : '';

    const timeInfo = item.content_type === 'audio' ? durationStr : readingStr;

    return `${idx + 1}. ${contentType} - ${sourceName}${timeInfo}
${item.summary}
---`;
  }).join('\n\n');
}

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
   * Intelligently handles any number of content items (audio + web)
   * @param contentItems - Array of completed content items (audio transcriptions + web content)
   * @returns Final digest text
   */
  async generateDigest(contentItems: DigestContentItem[]): Promise<string> {
    log.info("Starting map-reduce digest generation", {
      contentItemCount: contentItems.length,
      audioCount: contentItems.filter(c => c.content_type === 'audio').length,
      articleCount: contentItems.filter(c => c.content_type === 'article').length,
    });

    try {
      // Step 1: Extract summaries from unified content items
      const summaries = contentItems.map((item) => item.summary || "No summary available");

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
      const intermediateSummaries = await this.mapPhase(batches, contentItems);

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
   * @param batches - Array of summary batches (strings)
   * @param contentItems - Original content items for metadata
   * @returns Array of intermediate summaries
   */
  private async mapPhase(
    batches: string[][],
    contentItems: DigestContentItem[]
  ): Promise<string[]> {
    log.info("Starting map phase", { batchCount: batches.length });

    // Track current index for matching summaries to content items
    let currentIndex = 0;

    const mapPromises = batches.map(async (batch, batchIndex) => {
      log.info("Processing batch", {
        batchIndex,
        batchSize: batch.length,
      });

      // Get corresponding content items for this batch
      const batchContentItems = contentItems.slice(
        currentIndex,
        currentIndex + batch.length
      );
      currentIndex += batch.length;

      // Format with metadata (audio vs article info)
      const formattedBatch = formatContentItemsWithMetadata(batchContentItems);

      // Create document for LangChain
      const doc = new Document({
        pageContent: formattedBatch,
        metadata: { batchIndex },
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
    contentItems: DigestContentItem[]
  ): Promise<string> {
    log.info("Using LangChain built-in map-reduce chain", {
      contentItemCount: contentItems.length,
      audioCount: contentItems.filter(c => c.content_type === 'audio').length,
      articleCount: contentItems.filter(c => c.content_type === 'article').length,
    });

    try {
      // Convert content items to documents
      const docs = contentItems.map(
        (item, idx) =>
          new Document({
            pageContent: item.summary || "No summary",
            metadata: {
              bookmarkId: item.bookmark_id,
              source: item.source,
              contentType: item.content_type,
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
