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
export const MAP_REDUCE_MAP_PROMPT = `You are the segment editor for the "Memai Daily Briefing" news bulletin.
Study the item dossiers below and emit structured beats that feel ready for a morning rundown.

Item dossiers:
{batch_summaries}

Return ONLY valid JSON (no prose) — one object per item, in the SAME order — using this schema:
[
  {{
    "item_number": <integer provided in the dossier>,
    "group_key": "<2-3 word slug in lowercase; reuse for related items>",
    "segment_title": "<6-10 word punchy slug for on-air graphic>",
    "headline": "<<=18 words broadcast-style headline>",
    "urgency_score": <integer 1-5 (5 = immediate)>,
    "urgency_label": "<Immediate|High|Watch|Background>",
    "why_it_matters": "<=28 words translating impact for the user>",
    "fast_facts": ["<=12 word fact with concrete detail", "optional fact 2", "optional fact 3"],
    "soundbite": "<=18 words memorable quote/phrasing (or \"n/a\")>",
    "format_cue": "<e.g. '🎧 Audio briefing', '📄 Quick read'>",
    "action_step": "<=14 words suggesting how the user should engage>",
    "forward_signal": "<=14 words flagging next event or watch item>",
    "tags": ["markets", "earnings", "policy"],
    "source_notes": "<mention source nature, e.g. 'YouTube deep dive'>"
  }},
  ...
]

Rules:
- Invent specific, truthful details only if clearly implied; avoid vagueness.
- Every item must include at least one fast fact and one tag.
- Keep language broadcast-ready and free of markdown.`;

/**
 * Map-Reduce Reduce Prompt
 * Combines intermediate analyses into final digest
 */
export const CLUSTER_SUMMARY_PROMPT = `You are producing a segment brief for the "Memai Daily Briefing" host table read.
Cluster slug: {cluster_slug}
Candidate titles: {candidate_titles}
Aggregate tags: {cluster_tags}
Shared urgency: {cluster_urgency}
Format cues heard: {cluster_formats}
Items:
{cluster_items}

Reply in VALID JSON using this shape:
{{
  "segment_name": "<final title for lower-third graphic>",
  "anchor_intro": "<=55 words stitching the items into one storyline>",
  "essential_points": ["<=16 word point 1", "point 2", "optional point 3"],
  "highlight_soundbite": "<=18 words pulling from or inspired by the beats",
  "recommended_action": "<=16 words telling the user what to do next",
  "segue": "<=18 words hinting how to transition onward"
}}

Rules:
- Weave all provided facts; never drop consequential details.
- Keep tone energetic, confident, and conversational for spoken delivery.`;

export const MAP_REDUCE_REDUCE_PROMPT = `You are the showrunner scripting the on-air bulletin for "Memai Daily Briefing".
Date: {digest_date}. Total items: {total_items} (Audio: {audio_count}, Articles: {article_count}).
Spotlight cluster: {spotlight_slug}

You have curated segment briefs ready for air:
{cluster_briefs}

Produce the FINAL transcript in Markdown with this exact layout:

## TL;DR
- Bullet 1 (<=12 words, concrete takeaway)
- Bullet 2
- Bullet 3

## Spotlight Story
<One tight paragraph (<=110 words) using the spotlight cluster. Include urgency label and format cues inline (e.g. "[Immediate • 🎧]").>

## Need-to-Know
<1 paragraph synthesising the remaining high-urgency clusters (urgency_score >=4). Reference recommended actions.>

## Signals & Next Steps
<1 paragraph covering watch/background clusters, emphasising forward signals and segue guidance.>

Tone: authoritative, friendly, time-efficient. Keep total length 420-650 words.
Mandatory: weave in the provided soundbites or adapt them into natural speech.
Do NOT invent new sections or add closing salutations.`;

// ============================================
// Metadata Formatting Helpers
// ============================================

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
