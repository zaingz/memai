import { BookmarkSource } from "../types/domain.types";

/**
 * Source-specific OpenAI prompt instructions
 * Each source can have customized summary generation instructions
 */
export const SUMMARY_PROMPTS: Record<BookmarkSource, string> = {
  [BookmarkSource.YOUTUBE]: `You are a helpful assistant that creates concise, informative summaries of YouTube video transcripts.
Focus on:
- Main topics and key points discussed
- Important takeaways and conclusions
- Any actionable insights or recommendations
Keep the summary clear and well-structured.`,

  [BookmarkSource.PODCAST]: `You are a helpful assistant that creates concise, informative summaries of podcast episode transcripts.
Focus on:
- Main discussion topics and themes
- Key arguments or insights from the hosts/guests
- Important quotes or memorable moments
- Actionable takeaways for listeners
Keep the summary engaging and well-structured.`,

  [BookmarkSource.REDDIT]: `You are a helpful assistant that summarizes Reddit discussions.
Focus on:
- Main post content and context
- Top-voted comments and perspectives
- Overall community sentiment
- Key insights or conclusions from the thread
Keep the summary balanced and informative.`,

  [BookmarkSource.TWITTER]: `You are a helpful assistant that summarizes Twitter threads.
Focus on:
- Main argument or narrative of the thread
- Key points made by the author
- Important context or references
- Overall message and takeaways
Keep the summary concise and to-the-point.`,

  [BookmarkSource.LINKEDIN]: `You are a helpful assistant that summarizes LinkedIn posts and articles.
Focus on:
- Professional insights and perspectives
- Key business or career advice
- Important data or examples shared
- Actionable takeaways for professionals
Keep the summary professional and value-focused.`,

  [BookmarkSource.BLOG]: `You are a helpful assistant that summarizes blog posts and articles.
Focus on:
- Main argument or thesis
- Key supporting points and evidence
- Important examples or case studies
- Conclusions and takeaways
Keep the summary clear and comprehensive.`,

  [BookmarkSource.WEB]: `You are a helpful assistant that creates concise, informative summaries of web content.
Focus on:
- Main topic and purpose
- Key information and insights
- Important details and context
- Overall value and takeaways
Keep the summary clear and well-structured.`,

  [BookmarkSource.OTHER]: `You are a helpful assistant that creates concise, informative summaries.
Focus on the main points, key insights, and important takeaways.
Keep the summary clear and well-structured.`,
};

/**
 * Default prompt for unknown or new sources
 */
export const DEFAULT_SUMMARY_PROMPT = SUMMARY_PROMPTS[BookmarkSource.OTHER];

// ============================================
// Daily Digest Prompt Templates
// ============================================

/**
 * Map-Reduce Map Prompt
 * Applied to each batch of summaries to extract themes and insights
 */
export const MAP_REDUCE_MAP_PROMPT = `Analyze this batch of bookmark summaries and extract the core value:

{batch_summaries}

For each summary, identify:
1. **Main Theme/Topic**: What is this about at its core?
2. **Key Insight**: What's the most valuable idea or learning?
3. **Actionable Takeaway**: What can someone do with this information?
4. **Related Concepts**: What other topics/ideas does this connect to?

Be comprehensive but focused. Preserve the unique value of each piece.`;

/**
 * Map-Reduce Reduce Prompt
 * Combines intermediate analyses into final digest
 */
export const MAP_REDUCE_REDUCE_PROMPT = `Synthesize these analyses into a compelling daily digest:

{intermediate_summaries}

Create an insightful digest that:

## TL;DR (2-3 sentences)
The most important takeaway from today's content

## Main Themes
- Identify 2-3 overarching themes
- Explain how they connect or contrast
- Note any surprising patterns

## Key Insights
- Most valuable ideas across all content
- Novel perspectives or approaches
- Important facts or data points

## Cross-Content Connections
- How different pieces relate to each other
- Complementary or contradictory viewpoints
- Emerging narratives or trends

## Recommended Next Steps
- What to prioritize reading/watching in detail
- Questions to explore further
- Potential applications

Be engaging and insightful. Focus on WHY this content matters, not just WHAT it says. Target 800-1200 words.`;

// ============================================
// Metadata Formatting Helpers
// ============================================

/**
 * Format a single summary with metadata for inclusion in prompts
 */
export function formatSummaryWithMetadata(summary: {
  bookmark_id: number;
  transcript: string | null;
  summary: string | null;
  deepgram_summary: string | null;
  source: BookmarkSource;
  duration: number | null;
  sentiment: "positive" | "negative" | "neutral" | null;
  created_at: Date;
}): string {
  const summaryText = summary.summary || summary.deepgram_summary || "No summary available";
  const durationMin = summary.duration ? Math.round(summary.duration / 60) : null;
  const durationStr = durationMin ? ` (${durationMin} min)` : "";
  const sentimentStr = summary.sentiment ? ` [${summary.sentiment}]` : "";

  return `### ${summary.source.toUpperCase()} Content${durationStr}${sentimentStr}
${summaryText}
---`;
}

/**
 * Format multiple summaries with metadata
 */
export function formatSummariesWithMetadata(
  summaries: Array<{
    bookmark_id: number;
    transcript: string | null;
    summary: string | null;
    deepgram_summary: string | null;
    source: BookmarkSource;
    duration: number | null;
    sentiment: "positive" | "negative" | "neutral" | null;
    created_at: Date;
  }>
): string {
  return summaries.map((s, i) => `${i + 1}. ${formatSummaryWithMetadata(s)}`).join("\n\n");
}

/**
 * Group summaries by source for Tier 2 processing
 */
export function groupSummariesBySource(
  summaries: Array<{
    bookmark_id: number;
    transcript: string | null;
    summary: string | null;
    deepgram_summary: string | null;
    source: BookmarkSource;
    duration: number | null;
    sentiment: "positive" | "negative" | "neutral" | null;
    created_at: Date;
  }>
): Map<BookmarkSource, typeof summaries> {
  const grouped = new Map<BookmarkSource, typeof summaries>();

  for (const summary of summaries) {
    const existing = grouped.get(summary.source) || [];
    existing.push(summary);
    grouped.set(summary.source, existing);
  }

  return grouped;
}

/**
 * Format source name for display
 */
export function formatSourceName(source: BookmarkSource): string {
  const sourceNames: Record<BookmarkSource, string> = {
    [BookmarkSource.YOUTUBE]: "YouTube Video",
    [BookmarkSource.PODCAST]: "Podcast Episode",
    [BookmarkSource.REDDIT]: "Reddit Post",
    [BookmarkSource.TWITTER]: "Twitter Thread",
    [BookmarkSource.LINKEDIN]: "LinkedIn Article",
    [BookmarkSource.BLOG]: "Blog Post",
    [BookmarkSource.WEB]: "Web Article",
    [BookmarkSource.OTHER]: "Other Content",
  };

  return sourceNames[source] || source;
}
