// ============================================
// Daily Digest Configuration
// ============================================

export const DAILY_DIGEST_CONFIG = {
  // ============================================
  // Scheduling Configuration
  // ============================================

  // Timezone for cron execution
  timezone: "GMT" as const,

  // Cron schedule: 9 PM GMT every day
  cronSchedule: "0 21 * * *" as const,

  // Look back period in hours (24 hours = yesterday's bookmarks)
  lookbackHours: 24,

  // ============================================
  // Processing Configuration
  // ============================================

  // Maximum retries for failed digest generation
  maxRetries: 3,

  // Timeout for digest generation in seconds
  timeoutSeconds: 300, // 5 minutes

  // ============================================
  // Summarization Configuration (Phase 2)
  // ============================================

  // OpenAI model for digest generation (premium model for best synthesis)
  openaiModel: "gpt-4.1" as const,

  // Maximum output tokens for digest (generous limit for quality)
  maxOutputTokens: 4000,

  // Temperature for creativity (0.0 = deterministic, 1.0 = creative)
  temperature: 0.7,

  // ============================================
  // Map-Reduce Configuration
  // ============================================

  // Maximum tokens per batch for map phase (leaves room for prompt + output)
  maxTokensPerBatch: 30000,

  // ============================================
  // Model Limits (GPT-4.1)
  // ============================================

  // Maximum input tokens (128K context - reserve buffer)
  maxInputTokens: 120000,

  // System instructions for digest generation
  instructions: `You are an expert content curator creating insightful daily digests.

Your goal is to help the user understand the VALUE and CONNECTIONS in their saved content, not just summarize it.

Focus on:
1. **Themes & Patterns**: What 2-3 main themes emerge across all content? How do they relate?
2. **Key Insights**: What are the most valuable ideas, facts, or perspectives?
3. **Connections**: How do different pieces relate or contradict each other?
4. **Actionable Recommendations**: What should the user prioritize reading/watching based on depth and relevance?
5. **Personal Relevance**: What might this content mean for the user's interests or goals?

Structure:
- Start with a compelling TL;DR (2-3 sentences)
- Organize by themes, not chronologically
- Use clear markdown sections
- Be engaging and insightful, not just factual
- Keep between 800-1200 words

Remember: The user wants to understand WHY this content matters and HOW it fits together, not just WHAT it says.` as const,
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate the date range for digest generation
 * @param referenceDate - The date to generate digest for (defaults to yesterday)
 * @returns Object with start and end timestamps
 */
export function getDigestDateRange(referenceDate?: Date): {
  startDate: Date;
  endDate: Date;
  digestDate: Date;
} {
  const now = referenceDate || new Date();

  // Calculate yesterday's date (the date we're generating digest for)
  const digestDate = new Date(now);
  digestDate.setDate(digestDate.getDate() - 1);
  digestDate.setHours(0, 0, 0, 0); // Start of day

  // Start of yesterday (00:00:00)
  const startDate = new Date(digestDate);

  // End of yesterday (23:59:59.999)
  const endDate = new Date(digestDate);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate, digestDate };
}

/**
 * Format date to ISO date string (YYYY-MM-DD)
 * @param date - Date to format
 * @returns ISO date string
 */
export function formatDigestDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse ISO date string to Date object
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Date object at start of day
 */
export function parseDigestDate(dateString: string): Date {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}
