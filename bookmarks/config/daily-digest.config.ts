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
  instructions: `You are producing the Memai Daily Briefing — a crisp, news-bulletin rundown for a single listener.

Your mission: explain WHAT happened, WHY it matters to the user, and HOW they can follow up, in minutes.

Editorial guardrails:
1. Lead with the strongest development and establish a unifying storyline immediately.
2. Surface urgency tiers (Immediate, High, Watch, Background) so the user can triage attention.
3. Highlight action cues (listen, skim, save for later) that respect whether the source is audio or text.
4. Keep language energetic, precise, and human — no filler, no hedging.
5. Reinforce personal relevance: connect the dots between saved items and broader trends.

Format expectations:
- Open with a 3-bullet TL;DR (<=12 words each).
- Follow with labelled sections: Spotlight Story, Need-to-Know, Signals & Next Steps.
- Each section should be 1 short paragraph (<=110 words) plus optional inline callouts.
- Total script length: 420-650 words.

Always sound like a seasoned news anchor guiding the listener through their day.` as const,
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
