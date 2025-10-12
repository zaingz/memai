/**
 * Token estimation utilities for OpenAI API usage
 * Uses character-based approximation (chars / 4) as recommended by OpenAI
 */

/**
 * Estimates token count from text using character approximation
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // OpenAI recommends: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Estimates total tokens for multiple text pieces
 * @param texts - Array of text strings
 * @returns Total estimated token count
 */
export function estimateTotalTokens(texts: string[]): number {
  return texts.reduce((total, text) => total + estimateTokenCount(text), 0);
}

/**
 * Validates if text fits within context window limits
 * @param text - Text to validate
 * @param maxTokens - Maximum token limit for the model
 * @param reservedTokens - Tokens to reserve for prompt/system instructions (default: 1000)
 * @returns True if text fits within limits
 */
export function validateContextWindow(
  text: string,
  maxTokens: number,
  reservedTokens: number = 1000
): boolean {
  const estimatedTokens = estimateTokenCount(text);
  return estimatedTokens <= maxTokens - reservedTokens;
}

/**
 * Calculates optimal batch size for processing large sets of summaries
 * @param summaries - Array of summary texts
 * @param maxTokensPerBatch - Maximum tokens allowed per batch
 * @param overheadTokens - Tokens for prompt template overhead (default: 500)
 * @returns Optimal number of summaries per batch
 */
export function calculateBatchSize(
  summaries: string[],
  maxTokensPerBatch: number,
  overheadTokens: number = 500
): number {
  if (summaries.length === 0) return 0;

  const availableTokens = maxTokensPerBatch - overheadTokens;
  const avgTokensPerSummary = estimateTotalTokens(summaries) / summaries.length;

  const optimalBatchSize = Math.floor(availableTokens / avgTokensPerSummary);

  // Return at least 1, but no more than total summaries
  return Math.max(1, Math.min(optimalBatchSize, summaries.length));
}

/**
 * Splits summaries into batches based on token limits
 * @param summaries - Array of summary texts
 * @param maxTokensPerBatch - Maximum tokens per batch
 * @returns Array of batches
 */
export function batchSummaries(
  summaries: string[],
  maxTokensPerBatch: number
): string[][] {
  if (summaries.length === 0) return [];

  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentBatchTokens = 0;

  for (const summary of summaries) {
    const summaryTokens = estimateTokenCount(summary);

    // If adding this summary would exceed limit, start new batch
    if (
      currentBatchTokens + summaryTokens > maxTokensPerBatch &&
      currentBatch.length > 0
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchTokens = 0;
    }

    currentBatch.push(summary);
    currentBatchTokens += summaryTokens;
  }

  // Add final batch if not empty
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Gets token usage statistics for a set of summaries
 * @param summaries - Array of summary texts
 * @returns Token statistics
 */
export function getTokenStats(summaries: string[]): {
  totalTokens: number;
  avgTokens: number;
  minTokens: number;
  maxTokens: number;
  count: number;
} {
  if (summaries.length === 0) {
    return {
      totalTokens: 0,
      avgTokens: 0,
      minTokens: 0,
      maxTokens: 0,
      count: 0,
    };
  }

  const tokenCounts = summaries.map(estimateTokenCount);
  const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);

  return {
    totalTokens,
    avgTokens: Math.round(totalTokens / summaries.length),
    minTokens: Math.min(...tokenCounts),
    maxTokens: Math.max(...tokenCounts),
    count: summaries.length,
  };
}
