// This file was bundled by Encore v1.50.4
//
// https://encore.dev
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// bookmarks/types/domain.types.ts
var init_domain_types = __esm({
  "bookmarks/types/domain.types.ts"() {
    "use strict";
  }
});

// bookmarks/config/daily-digest.config.ts
function getDigestDateRange(referenceDate) {
  const now = referenceDate || /* @__PURE__ */ new Date();
  const digestDate = new Date(now);
  digestDate.setDate(digestDate.getDate() - 1);
  digestDate.setHours(0, 0, 0, 0);
  const startDate = new Date(digestDate);
  const endDate = new Date(digestDate);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate, digestDate };
}
function formatDigestDate(date) {
  return date.toISOString().split("T")[0];
}
function parseDigestDate(dateString) {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}
var DAILY_DIGEST_CONFIG;
var init_daily_digest_config = __esm({
  "bookmarks/config/daily-digest.config.ts"() {
    "use strict";
    DAILY_DIGEST_CONFIG = {
      // ============================================
      // Scheduling Configuration
      // ============================================
      // Timezone for cron execution
      timezone: "GMT",
      // Cron schedule: 9 PM GMT every day
      cronSchedule: "0 21 * * *",
      // Look back period in hours (24 hours = yesterday's bookmarks)
      lookbackHours: 24,
      // ============================================
      // Processing Configuration
      // ============================================
      // Maximum retries for failed digest generation
      maxRetries: 3,
      // Timeout for digest generation in seconds
      timeoutSeconds: 300,
      // 5 minutes
      // ============================================
      // Summarization Configuration (Phase 2)
      // ============================================
      // OpenAI model for digest generation (premium model for best synthesis)
      openaiModel: "gpt-4.1",
      // Maximum output tokens for digest (generous limit for quality)
      maxOutputTokens: 4e3,
      // Temperature for creativity (0.0 = deterministic, 1.0 = creative)
      temperature: 0.7,
      // ============================================
      // Map-Reduce Configuration
      // ============================================
      // Maximum tokens per batch for map phase (leaves room for prompt + output)
      maxTokensPerBatch: 3e4,
      // ============================================
      // Model Limits (GPT-4.1)
      // ============================================
      // Maximum input tokens (128K context - reserve buffer)
      maxInputTokens: 12e4,
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

Remember: The user wants to understand WHY this content matters and HOW it fits together, not just WHAT it says.`
    };
  }
});

// bookmarks/config/prompts.config.ts
function formatSourceName(source) {
  const sourceNames = {
    ["youtube" /* YOUTUBE */]: "YouTube Video",
    ["podcast" /* PODCAST */]: "Podcast Episode",
    ["reddit" /* REDDIT */]: "Reddit Post",
    ["twitter" /* TWITTER */]: "Twitter Thread",
    ["linkedin" /* LINKEDIN */]: "LinkedIn Article",
    ["blog" /* BLOG */]: "Blog Post",
    ["web" /* WEB */]: "Web Article",
    ["other" /* OTHER */]: "Other Content"
  };
  return sourceNames[source] || source;
}
var SUMMARY_PROMPTS, DEFAULT_SUMMARY_PROMPT, MAP_REDUCE_MAP_PROMPT, CLUSTER_SUMMARY_PROMPT, MAP_REDUCE_REDUCE_PROMPT;
var init_prompts_config = __esm({
  "bookmarks/config/prompts.config.ts"() {
    "use strict";
    init_domain_types();
    SUMMARY_PROMPTS = {
      ["youtube" /* YOUTUBE */]: `You are a helpful assistant that creates concise, informative summaries of YouTube video transcripts.
Focus on:
- Main topics and key points discussed
- Important takeaways and conclusions
- Any actionable insights or recommendations
Keep the summary clear and well-structured.`,
      ["podcast" /* PODCAST */]: `You are a helpful assistant that creates concise, informative summaries of podcast episode transcripts.
Focus on:
- Main discussion topics and themes
- Key arguments or insights from the hosts/guests
- Important quotes or memorable moments
- Actionable takeaways for listeners
Keep the summary engaging and well-structured.`,
      ["reddit" /* REDDIT */]: `You are a helpful assistant that summarizes Reddit discussions.
Focus on:
- Main post content and context
- Top-voted comments and perspectives
- Overall community sentiment
- Key insights or conclusions from the thread
Keep the summary balanced and informative.`,
      ["twitter" /* TWITTER */]: `You are a helpful assistant that summarizes Twitter threads.
Focus on:
- Main argument or narrative of the thread
- Key points made by the author
- Important context or references
- Overall message and takeaways
Keep the summary concise and to-the-point.`,
      ["linkedin" /* LINKEDIN */]: `You are a helpful assistant that summarizes LinkedIn posts and articles.
Focus on:
- Professional insights and perspectives
- Key business or career advice
- Important data or examples shared
- Actionable takeaways for professionals
Keep the summary professional and value-focused.`,
      ["blog" /* BLOG */]: `You are a helpful assistant that summarizes blog posts and articles.
Focus on:
- Main argument or thesis
- Key supporting points and evidence
- Important examples or case studies
- Conclusions and takeaways
Keep the summary clear and comprehensive.`,
      ["web" /* WEB */]: `You are a helpful assistant that creates concise, informative summaries of web content.
Focus on:
- Main topic and purpose
- Key information and insights
- Important details and context
- Overall value and takeaways
Keep the summary clear and well-structured.`,
      ["other" /* OTHER */]: `You are a helpful assistant that creates concise, informative summaries.
Focus on the main points, key insights, and important takeaways.
Keep the summary clear and well-structured.`
    };
    DEFAULT_SUMMARY_PROMPT = SUMMARY_PROMPTS["other" /* OTHER */];
    MAP_REDUCE_MAP_PROMPT = `You are the editorial analyst for the audio show "Memai Daily Briefing".
Read the item notes below and emit structured beats the host can stitch together.

Item notes:
{batch_summaries}

Return ONLY valid JSON (no prose) matching this schema — one object per item, in the SAME order:
[
  {{
    "item_number": <integer provided in the notes>,
    "group_key": "<2-3 word slug in lowercase, reuse exact slug for related items>",
    "theme_title": "<5-8 word compelling title>",
    "one_sentence_summary": "<<=25 words capturing the core insight>",
    "key_facts": ["<=18 word fact 1 with concrete details", "fact 2", "... optional fact 3"],
    "context_and_implication": "<=30 words showing broader stakes/trend>",
    "signals": "<=18 words highlighting forward-looking cue or question>",
    "tags": ["markets", "earnings", "..."],
    "source_notes": "<short mention of source type, e.g. 'YouTube deep dive'>"
  }},
  ...
]

Rules:
- If an item lacks numbers, infer a concrete detail from context (e.g. "signals a sentiment shift among retail investors").
- Tags must be lowercase single words; include at least one tag per item.
- Do NOT add commentary outside the JSON payload.`;
    CLUSTER_SUMMARY_PROMPT = `You are crafting a unified theme brief for "Memai Daily Briefing".
Cluster slug: {cluster_slug}
Candidate titles: {candidate_titles}
Aggregate tags: {cluster_tags}
Items:
{cluster_items}

Respond in VALID JSON with this exact shape:
{{
  "cluster_title": "...",
  "narrative_paragraph": "...", 
  "key_takeaways": ["...", "..."],
  "bridge_sentence": "..." 
}}

Rules:
- The narrative paragraph should gracefully combine ALL item facts without bulleting or numbering.
- Key takeaways must be punchy (<18 words) and non-redundant; include at least two distinct angles.
- Bridge sentence should hint how to segue into another topic (even if hypothetical).`;
    MAP_REDUCE_REDUCE_PROMPT = `You are the showrunner for "Memai Daily Briefing".
Date: {digest_date}. Total items: {total_items} (Audio: {audio_count}, Articles: {article_count}).

You are given cluster briefs that already blend related items:
{cluster_briefs}

Write the final host script as flowing prose (no headings, numbers, or bullet lists). Target 4-5 paragraphs:
- Paragraph 1: Cold open weaving the strongest cluster into an overarching narrative hook.
- Middle paragraphs: One per remaining cluster. Integrate their narratives, cite sources conversationally (e.g. "a YouTube deep dive" or "today's blog breakdown"), and explain the stakes and connections.
- Closing paragraph: Synthesize the day, offer a forward-looking takeaway or question, and sign off with momentum.

Guidelines:
- Reuse key takeaways organically; do not repeat them verbatim.
- Mention variety of sources only when it adds colour or credibility.
- Keep total length 550-850 words with varied sentence rhythm.
- Absolutely avoid explicit section labels, bullets, or enumerated lists.`;
  }
});

// bookmarks/utils/token-estimator.util.ts
function estimateTokenCount(text) {
  if (!text)
    return 0;
  return Math.ceil(text.length / 4);
}
function batchSummaries(summaries, maxTokensPerBatch) {
  if (summaries.length === 0)
    return [];
  const batches = [];
  let currentBatch = [];
  let currentBatchTokens = 0;
  for (const summary of summaries) {
    const summaryTokens = estimateTokenCount(summary);
    if (currentBatchTokens + summaryTokens > maxTokensPerBatch && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchTokens = 0;
    }
    currentBatch.push(summary);
    currentBatchTokens += summaryTokens;
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  return batches;
}
var init_token_estimator_util = __esm({
  "bookmarks/utils/token-estimator.util.ts"() {
    "use strict";
  }
});

// bookmarks/services/map-reduce-digest.service.ts
var map_reduce_digest_service_exports = {};
__export(map_reduce_digest_service_exports, {
  MapReduceDigestService: () => MapReduceDigestService
});
import log2 from "encore.dev/log";
import { ChatOpenAI } from "@langchain/openai";
function slugify(value, fallback) {
  const base = value?.trim().toLowerCase() || fallback.trim().toLowerCase();
  const slug = base.replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug || "general";
}
function normalizeTags(tags) {
  if (!tags)
    return [];
  return Array.from(
    new Set(
      tags.flatMap(
        (tag) => tag.split(/[,\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean)
      )
    )
  );
}
function termOverlap(a, b) {
  const tokenize = (value) => value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3);
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (!setA.size || !setB.size)
    return 0;
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token))
      intersection += 1;
  });
  return intersection / Math.min(setA.size, setB.size);
}
function extractJsonPayload(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      return extractJsonPayload(match[1]);
    }
    const firstBracket = trimmed.indexOf("[");
    const firstBrace = trimmed.indexOf("{");
    const start = firstBracket !== -1 ? firstBracket : firstBrace;
    if (start !== -1) {
      const snippet = trimmed.slice(start);
      try {
        return JSON.parse(snippet);
      } catch {
      }
    }
    throw new Error("Unable to parse JSON payload from LLM response");
  }
}
function formatContentItemsWithMetadata(items, startIndex) {
  return items.map((item, idx) => {
    const sourceName = formatSourceName(item.source);
    const contentType = item.content_type === "audio" ? "🎧 Audio" : "📄 Article";
    const title = item.title || sourceName;
    const createdAt = item.created_at ? new Date(item.created_at).toISOString() : "unknown";
    const itemNumber = startIndex + idx + 1;
    const durationStr = item.content_type === "audio" && item.duration ? `${Math.max(1, Math.round(item.duration / 60))} min runtime` : null;
    const readingStr = item.content_type === "article" && item.reading_minutes ? `${item.reading_minutes} min read` : null;
    const sentimentStr = item.sentiment ? `tone: ${item.sentiment}` : null;
    const metaParts = [
      durationStr,
      readingStr,
      sentimentStr
    ].filter(Boolean);
    const metadataLine = metaParts.length ? `Meta: ${metaParts.join(" · ")}` : null;
    return `[ITEM ${itemNumber}]
Type: ${contentType}
Title: ${title}
Source: ${sourceName}
Captured: ${createdAt}
${metadataLine ? metadataLine + "\n" : ""}Summary:
${item.summary}
---`;
  }).join("\n\n");
}
var MapReduceDigestService;
var init_map_reduce_digest_service = __esm({
  "bookmarks/services/map-reduce-digest.service.ts"() {
    "use strict";
    init_daily_digest_config();
    init_prompts_config();
    init_token_estimator_util();
    MapReduceDigestService = class {
      llm;
      constructor(openaiApiKey3) {
        this.llm = new ChatOpenAI({
          model: DAILY_DIGEST_CONFIG.openaiModel,
          temperature: DAILY_DIGEST_CONFIG.temperature,
          maxTokens: DAILY_DIGEST_CONFIG.maxOutputTokens,
          apiKey: openaiApiKey3
        });
      }
      clusterBeats(beats) {
        const clusters = [];
        const slugMap = /* @__PURE__ */ new Map();
        for (const beat of beats) {
          const normalizedSlug = beat.groupKey || slugify(beat.themeTitle, "general");
          let cluster = slugMap.get(normalizedSlug);
          if (!cluster) {
            cluster = this.findClusterForBeat(normalizedSlug, beat, clusters);
            if (!cluster) {
              cluster = {
                slug: normalizedSlug,
                beats: [],
                tags: /* @__PURE__ */ new Set()
              };
              clusters.push(cluster);
            }
            slugMap.set(normalizedSlug, cluster);
          }
          cluster.beats.push(beat);
          beat.tags.forEach((tag) => cluster.tags.add(tag));
        }
        return clusters;
      }
      findClusterForBeat(slug, beat, clusters) {
        const beatTags = new Set(beat.tags);
        const directMatch = clusters.find((cluster) => cluster.slug === slug);
        if (directMatch) {
          return directMatch;
        }
        let bestMatch;
        for (const cluster of clusters) {
          const clusterTags = cluster.tags;
          let overlap = 0;
          beatTags.forEach((tag) => {
            if (clusterTags.has(tag))
              overlap += 1;
          });
          const tagScore = beatTags.size && clusterTags.size ? overlap / Math.min(beatTags.size, clusterTags.size) : 0;
          const titleScore = termOverlap(
            beat.themeTitle,
            cluster.beats[0]?.themeTitle || ""
          );
          const combinedScore = Math.max(tagScore, titleScore);
          if (combinedScore >= 0.5) {
            if (!bestMatch || combinedScore > bestMatch.score) {
              bestMatch = { cluster, score: combinedScore };
            }
          }
        }
        return bestMatch?.cluster;
      }
      async summarizeClusters(clusters) {
        const summaries = [];
        for (const [index, cluster] of clusters.entries()) {
          const candidateTitles = Array.from(
            new Set(cluster.beats.map((beat) => beat.themeTitle).filter(Boolean))
          );
          const clusterItems = cluster.beats.map((beat) => {
            const facts = beat.keyFacts.map((fact) => `• ${fact}`).join("\n");
            const tags = beat.tags.join(", ") || "none";
            return `Item ${beat.itemNumber}:
  Title: ${beat.themeTitle}
  Summary: ${beat.oneSentenceSummary}
  Key facts:
${facts ? facts : "• (fact missing)"}
  Context: ${beat.contextAndImplication}
  Signals: ${beat.signals}
  Tags: ${tags}
  Source: ${beat.sourceNotes}`;
          }).join("\n\n");
          const prompt = CLUSTER_SUMMARY_PROMPT.replace(
            "{cluster_slug}",
            cluster.slug
          ).replace("{candidate_titles}", candidateTitles.join(" | ") || cluster.slug).replace("{cluster_tags}", Array.from(cluster.tags).join(", ") || "general").replace("{cluster_items}", clusterItems);
          const response = await this.llm.invoke(prompt);
          const payload = extractJsonPayload(response.content.toString());
          if (!payload?.cluster_title || !payload?.narrative_paragraph) {
            throw new Error(
              `Cluster summary missing fields for slug ${cluster.slug}`
            );
          }
          const keyTakeaways = Array.isArray(payload.key_takeaways) ? payload.key_takeaways.map((t) => t.toString()) : [];
          summaries.push({
            slug: cluster.slug,
            title: payload.cluster_title.toString(),
            narrative: payload.narrative_paragraph.toString(),
            keyTakeaways,
            bridgeSentence: (payload.bridge_sentence || "").toString(),
            tags: Array.from(cluster.tags)
          });
        }
        return summaries;
      }
      /**
       * Generates digest using LangChain map-reduce
       * Intelligently handles any number of content items (audio + web)
       * @param contentItems - Array of completed content items (audio transcriptions + web content)
       * @returns Final digest text
       */
      async generateDigest(contentItems, context) {
        const audioCount = contentItems.filter((c) => c.content_type === "audio").length;
        const articleCount = contentItems.filter((c) => c.content_type === "article").length;
        const totalItems = contentItems.length;
        log2.info("Starting map-reduce digest generation", {
          contentItemCount: totalItems,
          audioCount,
          articleCount
        });
        try {
          const summaries = contentItems.map((item) => item.summary || "No summary available");
          log2.info("Prepared summaries for processing", {
            summaryCount: summaries.length,
            totalTokensEstimate: summaries.reduce(
              (sum, s) => sum + estimateTokenCount(s),
              0
            )
          });
          const batches = batchSummaries(
            summaries,
            DAILY_DIGEST_CONFIG.maxTokensPerBatch
          );
          log2.info("Created batches for map phase", {
            batchCount: batches.length,
            avgBatchSize: Math.round(
              batches.reduce((sum, b) => sum + b.length, 0) / batches.length
            )
          });
          const mapBeats = await this.mapPhase(batches, contentItems);
          log2.info("Map phase completed", {
            beatCount: mapBeats.length
          });
          const clusters = this.clusterBeats(mapBeats);
          log2.info("Clustering completed", {
            clusterCount: clusters.length,
            clusterSlugs: clusters.map((c) => c.slug)
          });
          const clusterSummaries = await this.summarizeClusters(clusters);
          log2.info("Cluster summarisation completed", {
            clusterSummaryCount: clusterSummaries.length
          });
          const finalDigest = await this.reducePhase(clusterSummaries, {
            digestDate: context?.digestDate,
            totalItems: context?.totalItems ?? totalItems,
            audioCount: context?.audioCount ?? audioCount,
            articleCount: context?.articleCount ?? articleCount
          });
          log2.info("Map-reduce digest generation completed", {
            finalDigestLength: finalDigest.length
          });
          return finalDigest;
        } catch (error) {
          log2.error(error, "Map-reduce digest generation failed");
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
      async mapPhase(batches, contentItems) {
        log2.info("Starting map phase", { batchCount: batches.length });
        const beats = [];
        let currentIndex = 0;
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const batchContentItems = contentItems.slice(
            currentIndex,
            currentIndex + batch.length
          );
          log2.info("Processing batch", {
            batchIndex,
            batchSize: batch.length,
            startIndex: currentIndex
          });
          const formattedBatch = formatContentItemsWithMetadata(
            batchContentItems,
            currentIndex
          );
          const prompt = MAP_REDUCE_MAP_PROMPT.replace(
            "{batch_summaries}",
            formattedBatch
          );
          const response = await this.llm.invoke(prompt);
          const payload = extractJsonPayload(response.content.toString());
          if (!Array.isArray(payload)) {
            throw new Error("Map phase response was not an array");
          }
          if (payload.length !== batch.length) {
            log2.warn("Map response length mismatch, will align best effort", {
              expected: batch.length,
              received: payload.length
            });
          }
          payload.forEach((rawBeat, idx) => {
            const itemNumber = typeof rawBeat?.item_number === "number" ? rawBeat.item_number : currentIndex + idx + 1;
            const cleanKey = slugify(
              rawBeat?.group_key || "",
              rawBeat?.theme_title || ""
            );
            const tags = normalizeTags(rawBeat?.tags);
            beats.push({
              itemNumber,
              groupKey: cleanKey,
              rawGroupKey: (rawBeat?.group_key || "").toString(),
              themeTitle: (rawBeat?.theme_title || "").toString(),
              oneSentenceSummary: (rawBeat?.one_sentence_summary || "").toString(),
              keyFacts: Array.isArray(rawBeat?.key_facts) && rawBeat.key_facts.length ? rawBeat.key_facts.map((f) => f.toString()) : [],
              contextAndImplication: (rawBeat?.context_and_implication || "").toString(),
              signals: (rawBeat?.signals || "").toString(),
              tags,
              sourceNotes: (rawBeat?.source_notes || "").toString()
            });
          });
          currentIndex += batch.length;
        }
        return beats;
      }
      async reducePhase(clusterSummaries, context) {
        log2.info("Starting reduce phase", {
          clusterCount: clusterSummaries.length
        });
        if (clusterSummaries.length === 0) {
          throw new Error("No cluster summaries available for reduction");
        }
        const clusterBriefs = clusterSummaries.map((cluster, idx) => {
          const takeaways = cluster.keyTakeaways.map((t) => `- ${t}`).join("\n");
          return `Cluster ${idx + 1} (${cluster.slug})
Title: ${cluster.title}
Narrative: ${cluster.narrative}
KeyTakeaways:
${takeaways || "-"}
Bridge: ${cluster.bridgeSentence}
Tags: ${cluster.tags.join(", ") || "general"}`;
        }).join("\n\n");
        const reducePrompt = MAP_REDUCE_REDUCE_PROMPT.replace("{cluster_briefs}", clusterBriefs).replace("{digest_date}", context.digestDate || "Today").replace(
          "{total_items}",
          String(context.totalItems ?? clusterSummaries.length)
        ).replace("{audio_count}", String(context.audioCount ?? 0)).replace("{article_count}", String(context.articleCount ?? 0));
        const result = await this.llm.invoke(reducePrompt);
        return result.content.toString();
      }
    };
  }
});

// encore.gen/internal/clients/bookmarks/endpoints.js
var endpoints_exports = {};
__export(endpoints_exports, {
  create: () => create,
  createTest: () => createTest2,
  generateDailyDigest: () => generateDailyDigest,
  generateDigestTest: () => generateDigestTest2,
  generateYesterdaysDigest: () => generateYesterdaysDigest,
  get: () => get,
  getDailyDigest: () => getDailyDigest,
  getDetails: () => getDetails,
  list: () => list,
  listDailyDigests: () => listDailyDigests,
  remove: () => remove,
  update: () => update
});
import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";
async function createTest2(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.createTest(params, opts);
  }
  return apiCall("bookmarks", "createTest", params, opts);
}
async function generateDigestTest2(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.generateDigestTest(params, opts);
  }
  return apiCall("bookmarks", "generateDigestTest", params, opts);
}
async function create(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.create(params, opts);
  }
  return apiCall("bookmarks", "create", params, opts);
}
async function get(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.get(params, opts);
  }
  return apiCall("bookmarks", "get", params, opts);
}
async function list(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.list(params, opts);
  }
  return apiCall("bookmarks", "list", params, opts);
}
async function update(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.update(params, opts);
  }
  return apiCall("bookmarks", "update", params, opts);
}
async function remove(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.remove(params, opts);
  }
  return apiCall("bookmarks", "remove", params, opts);
}
async function getDetails(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.getDetails(params, opts);
  }
  return apiCall("bookmarks", "getDetails", params, opts);
}
async function generateDailyDigest(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.generateDailyDigest(params, opts);
  }
  return apiCall("bookmarks", "generateDailyDigest", params, opts);
}
async function getDailyDigest(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.getDailyDigest(params, opts);
  }
  return apiCall("bookmarks", "getDailyDigest", params, opts);
}
async function listDailyDigests(params, opts) {
  if (false) {
    return TEST_ENDPOINTS.listDailyDigests(params, opts);
  }
  return apiCall("bookmarks", "listDailyDigests", params, opts);
}
async function generateYesterdaysDigest(opts) {
  const params = void 0;
  if (false) {
    return TEST_ENDPOINTS.generateYesterdaysDigest(params, opts);
  }
  return apiCall("bookmarks", "generateYesterdaysDigest", params, opts);
}
var TEST_ENDPOINTS;
var init_endpoints = __esm({
  async "encore.gen/internal/clients/bookmarks/endpoints.js"() {
    "use strict";
    TEST_ENDPOINTS = false ? await null : null;
  }
});

// encore.gen/internal/clients/users/endpoints.js
var endpoints_exports2 = {};
__export(endpoints_exports2, {
  getUserIds: () => getUserIds,
  me: () => me,
  updateProfile: () => updateProfile,
  userCreated: () => userCreated
});
import { apiCall as apiCall2, streamIn as streamIn2, streamOut as streamOut2, streamInOut as streamInOut2 } from "encore.dev/internal/codegen/api";
async function me(opts) {
  const params = void 0;
  if (false) {
    return TEST_ENDPOINTS2.me(params, opts);
  }
  return apiCall2("users", "me", params, opts);
}
async function updateProfile(params, opts) {
  if (false) {
    return TEST_ENDPOINTS2.updateProfile(params, opts);
  }
  return apiCall2("users", "updateProfile", params, opts);
}
async function getUserIds(opts) {
  const params = void 0;
  if (false) {
    return TEST_ENDPOINTS2.getUserIds(params, opts);
  }
  return apiCall2("users", "getUserIds", params, opts);
}
async function userCreated(params, opts) {
  if (false) {
    return TEST_ENDPOINTS2.userCreated(params, opts);
  }
  return apiCall2("users", "userCreated", params, opts);
}
var TEST_ENDPOINTS2;
var init_endpoints2 = __esm({
  async "encore.gen/internal/clients/users/endpoints.js"() {
    "use strict";
    TEST_ENDPOINTS2 = false ? await null : null;
  }
});

// encore.gen/clients/index.js
var clients_exports = {};
__export(clients_exports, {
  bookmarks: () => endpoints_exports,
  users: () => endpoints_exports2
});
var init_clients = __esm({
  async "encore.gen/clients/index.js"() {
    "use strict";
    await init_endpoints();
    await init_endpoints2();
  }
});

// encore.gen/internal/entrypoints/combined/main.ts
import { registerGateways, registerHandlers, run } from "encore.dev/internal/codegen/appinit";

// users/auth.ts
import { Gateway, APIError } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { jwtVerify, createRemoteJWKSet, decodeJwt } from "jose";
import log from "encore.dev/log";
import { appMeta } from "encore.dev";

// users/config/supabase.config.ts
import { secret } from "encore.dev/config";
var supabaseURL = secret("SupabaseURL");
var supabaseAnonKey = secret("SupabaseAnonKey");
var supabaseServiceRoleKey = secret("SupabaseServiceRoleKey");
var SUPABASE_CONFIG = {
  /**
   * Project URL
   * Format: https://xxxxx.supabase.co
   */
  url: () => supabaseURL(),
  /**
   * Anonymous/Public key
   * Safe to use in frontend applications
   * Respects Row Level Security (RLS) policies
   */
  anonKey: () => supabaseAnonKey(),
  /**
   * Service role key
   * Full admin privileges, bypasses RLS
   * ONLY use server-side for admin operations
   * NEVER expose to clients or frontend
   */
  serviceRoleKey: () => supabaseServiceRoleKey(),
  /**
   * JWKS endpoint for JWT verification
   * Used by auth handler to validate Supabase JWTs
   * Format: https://xxxxx.supabase.co/auth/v1/.well-known/jwks.json
   */
  jwksEndpoint: () => `${supabaseURL()}/auth/v1/.well-known/jwks.json`,
  /**
   * Auth API endpoint
   * Base URL for authentication operations
   */
  authEndpoint: () => `${supabaseURL()}/auth/v1`
};

// users/auth.ts
var SUPABASE_JWKS = createRemoteJWKSet(
  new URL(SUPABASE_CONFIG.jwksEndpoint())
);
var auth = authHandler(
  async (params) => {
    try {
      if (!params.authorization || !params.authorization.startsWith("Bearer ")) {
        throw new Error(
          "Invalid Authorization header format. Expected: Bearer <token>"
        );
      }
      const token = params.authorization.substring(7);
      if (!token) {
        throw new Error("No token provided in Authorization header");
      }
      const env = appMeta().environment;
      const isTest = env.type === "test" || process.env.ENABLE_TEST_AUTH === "true";
      let supabasePayload;
      if (isTest) {
        log.info("Test mode: decoding JWT without JWKS verification");
        const decoded = decodeJwt(token);
        supabasePayload = decoded;
      } else {
        const { payload } = await jwtVerify(token, SUPABASE_JWKS, {
          issuer: SUPABASE_CONFIG.authEndpoint()
          // Verify issuer matches Supabase
        });
        supabasePayload = payload;
      }
      const authData = {
        userID: supabasePayload.sub,
        // Supabase user UUID
        email: supabasePayload.email || ""
      };
      log.info("User authenticated successfully", {
        userID: authData.userID,
        email: authData.email,
        testMode: isTest
      });
      return authData;
    } catch (error) {
      log.warn("JWT validation failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      throw APIError.unauthenticated(
        error instanceof Error ? error.message : "Authentication failed"
      );
    }
  }
);
var gateway = new Gateway({
  authHandler: auth
});

// bookmarks/api-test.ts
import { api } from "encore.dev/api";
import log4 from "encore.dev/log";

// bookmarks/db.ts
import { SQLDatabase } from "encore.dev/storage/sqldb";
var db = new SQLDatabase("bookmarks", {
  migrations: "./migrations"
});

// bookmarks/repositories/bookmark.repository.ts
var BookmarkRepository = class {
  constructor(db3) {
    this.db = db3;
  }
  /**
   * Creates a new bookmark
   */
  async create(data) {
    const row = await this.db.queryRow`
      INSERT INTO bookmarks (user_id, url, title, source, client_time, metadata)
      VALUES (
        ${data.user_id},
        ${data.url},
        ${data.title},
        ${data.source},
        ${data.client_time},
        ${data.metadata}
      )
      RETURNING *
    `;
    if (!row) {
      throw new Error("Failed to create bookmark");
    }
    return row;
  }
  /**
   * Finds a bookmark by ID (filtered by user_id for data isolation)
   */
  async findById(id, userId) {
    const row = await this.db.queryRow`
      SELECT * FROM bookmarks WHERE id = ${id} AND user_id = ${userId}
    `;
    return row || null;
  }
  /**
   * Lists bookmarks with pagination and optional filtering (filtered by user_id)
   */
  async list(params) {
    const { userId, limit, offset, source } = params;
    let bookmarksQuery;
    let countQuery;
    if (source) {
      bookmarksQuery = this.db.query`
        SELECT * FROM bookmarks
        WHERE user_id = ${userId} AND source = ${source}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countQuery = this.db.queryRow`
        SELECT COUNT(*)::int as count FROM bookmarks
        WHERE user_id = ${userId} AND source = ${source}
      `;
    } else {
      bookmarksQuery = this.db.query`
        SELECT * FROM bookmarks
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countQuery = this.db.queryRow`
        SELECT COUNT(*)::int as count FROM bookmarks
        WHERE user_id = ${userId}
      `;
    }
    const bookmarks = [];
    for await (const bookmark of bookmarksQuery) {
      bookmarks.push(bookmark);
    }
    const countResult = await countQuery;
    const total = countResult?.count || 0;
    return { bookmarks, total };
  }
  /**
   * Updates a bookmark (filtered by user_id)
   */
  async update(id, userId, data) {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error(`Bookmark with id ${id} not found for user ${userId}`);
    }
    const urlToUse = data.url !== void 0 ? data.url : existing.url;
    const titleToUse = data.title !== void 0 ? data.title : existing.title;
    const sourceToUse = data.source !== void 0 ? data.source : existing.source;
    const metadataToUse = data.metadata !== void 0 ? data.metadata : existing.metadata;
    const row = await this.db.queryRow`
      UPDATE bookmarks
      SET
        url = ${urlToUse},
        title = ${titleToUse},
        source = ${sourceToUse},
        metadata = ${metadataToUse}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    if (!row) {
      throw new Error("Failed to update bookmark");
    }
    return row;
  }
  /**
   * Updates only the source field of a bookmark
   * Used by classification processor to update detected source (internal operation)
   * NOTE: This is an internal method called by processors, so it doesn't require userId filtering
   */
  async updateSource(id, source) {
    const result = await this.db.queryRow`
      UPDATE bookmarks
      SET source = ${source}
      WHERE id = ${id}
      RETURNING id
    `;
    if (!result) {
      throw new Error(`Bookmark with id ${id} not found`);
    }
  }
  /**
   * Deletes a bookmark (filtered by user_id)
   */
  async delete(id, userId) {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error(`Bookmark with id ${id} not found for user ${userId}`);
    }
    await this.db.exec`
      DELETE FROM bookmarks WHERE id = ${id} AND user_id = ${userId}
    `;
  }
};

// bookmarks/events/bookmark-created.events.ts
import { Topic } from "encore.dev/pubsub";
var bookmarkCreatedTopic = new Topic(
  "bookmark-created",
  {
    deliveryGuarantee: "at-least-once"
  }
);

// bookmarks/types/index.ts
init_domain_types();

// bookmarks/repositories/daily-digest.repository.ts
var DailyDigestRepository = class {
  constructor(db3) {
    this.db = db3;
  }
  /**
   * Creates a new daily digest record with pending status
   * NOTE: Excludes JSONB fields from RETURNING due to Encore deserialization limitation
   */
  async create(data) {
    const row = await this.db.queryRow`
      INSERT INTO daily_digests (
        digest_date,
        user_id,
        status,
        bookmark_count,
        sources_breakdown,
        date_range_start,
        date_range_end
      )
      VALUES (
        ${data.digestDate},
        ${data.userId},
        'pending',
        ${data.bookmarkCount},
        ${data.sourcesBreakdown},
        ${data.dateRangeStart},
        ${data.dateRangeEnd}
      )
      RETURNING
        id, digest_date, user_id, status, bookmark_count,
        date_range_start, date_range_end, digest_content, total_duration,
        error_message, processing_started_at, processing_completed_at, created_at, updated_at
    `;
    if (!row) {
      throw new Error("Failed to create daily digest");
    }
    return {
      ...row,
      sources_breakdown: data.sourcesBreakdown,
      processing_metadata: null
    };
  }
  /**
   * Finds a digest by date and optional user ID
   * NOTE: Excludes JSONB fields due to Encore deserialization limitation
   */
  async findByDate(digestDate, userId) {
    const userIdValue = userId !== void 0 ? userId : null;
    const row = await this.db.queryRow`
      SELECT
        id, digest_date, user_id, status, bookmark_count,
        date_range_start, date_range_end, digest_content, total_duration,
        error_message, processing_started_at, processing_completed_at, created_at, updated_at
      FROM daily_digests
      WHERE digest_date = ${digestDate}
        AND user_id IS NOT DISTINCT FROM ${userIdValue}
    `;
    return row ? {
      ...row,
      sources_breakdown: null,
      processing_metadata: null
    } : null;
  }
  /**
   * Finds digests within a date range
   * NOTE: Excludes JSONB fields due to Encore deserialization limitation
   */
  async findByDateRange(startDate, endDate, userId) {
    const userIdValue = userId !== void 0 ? userId : null;
    const query = this.db.query`
      SELECT
        id, digest_date, user_id, status, bookmark_count,
        date_range_start, date_range_end, digest_content, total_duration,
        error_message, processing_started_at, processing_completed_at, created_at, updated_at
      FROM daily_digests
      WHERE digest_date >= ${startDate}
        AND digest_date <= ${endDate}
        AND user_id IS NOT DISTINCT FROM ${userIdValue}
      ORDER BY digest_date DESC
    `;
    const digests = [];
    for await (const digest of query) {
      digests.push({
        ...digest,
        sources_breakdown: null,
        processing_metadata: null
      });
    }
    return digests;
  }
  /**
   * Lists digests with pagination
   * NOTE: Excludes JSONB fields due to Encore deserialization limitation
   */
  async list(params) {
    const { limit, offset, userId } = params;
    const userIdValue = userId !== void 0 ? userId : null;
    const digestsQuery = this.db.query`
      SELECT
        id, digest_date, user_id, status, bookmark_count,
        date_range_start, date_range_end, digest_content, total_duration,
        error_message, processing_started_at, processing_completed_at, created_at, updated_at
      FROM daily_digests
      WHERE user_id IS NOT DISTINCT FROM ${userIdValue}
      ORDER BY digest_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const countQuery = this.db.queryRow`
      SELECT COUNT(*)::int as count FROM daily_digests
      WHERE user_id IS NOT DISTINCT FROM ${userIdValue}
    `;
    const digests = [];
    for await (const digest of digestsQuery) {
      digests.push({
        ...digest,
        sources_breakdown: null,
        processing_metadata: null
      });
    }
    const countResult = await countQuery;
    const total = countResult?.count || 0;
    return { digests, total };
  }
  /**
   * Checks if a digest exists for a given date
   */
  async existsForDate(digestDate, userId) {
    const userIdValue = userId !== void 0 ? userId : null;
    const row = await this.db.queryRow`
      SELECT EXISTS(
        SELECT 1 FROM daily_digests
        WHERE digest_date = ${digestDate}
          AND user_id IS NOT DISTINCT FROM ${userIdValue}
      ) as exists
    `;
    return row?.exists || false;
  }
  /**
   * Updates digest status
   */
  async updateStatus(id, status, errorMessage) {
    await this.db.exec`
      UPDATE daily_digests
      SET
        status = ${status},
        error_message = ${errorMessage || null},
        processing_completed_at = ${status === "completed" /* COMPLETED */ || status === "failed" /* FAILED */ ? /* @__PURE__ */ new Date() : null}
      WHERE id = ${id}
    `;
  }
  /**
   * Marks digest as processing
   */
  async markAsProcessing(id) {
    await this.db.exec`
      UPDATE daily_digests
      SET
        status = 'processing',
        processing_started_at = NOW()
      WHERE id = ${id}
    `;
  }
  /**
   * Marks digest as completed with content
   */
  async markAsCompleted(id, content, totalDuration, metadata) {
    await this.db.exec`
      UPDATE daily_digests
      SET
        status = 'completed',
        digest_content = ${content},
        total_duration = ${totalDuration},
        processing_metadata = ${metadata},
        processing_completed_at = NOW()
      WHERE id = ${id}
    `;
  }
  /**
   * Marks digest as failed with error message
   */
  async markAsFailed(id, errorMessage) {
    await this.db.exec`
      UPDATE daily_digests
      SET
        status = 'failed',
        error_message = ${errorMessage},
        processing_completed_at = NOW()
      WHERE id = ${id}
    `;
  }
  /**
   * Updates digest content (for Phase 2 summarization)
   */
  async updateContent(id, content, metadata) {
    await this.db.exec`
      UPDATE daily_digests
      SET
        digest_content = ${content},
        processing_metadata = ${metadata}
      WHERE id = ${id}
    `;
  }
  /**
   * Deletes a digest by ID
   */
  async delete(id) {
    const existing = await this.db.queryRow`
      SELECT id FROM daily_digests WHERE id = ${id}
    `;
    if (!existing) {
      throw new Error(`Daily digest with id ${id} not found`);
    }
    await this.db.exec`
      DELETE FROM daily_digests WHERE id = ${id}
    `;
  }
  // ============================================
  // Query Helpers for Transcriptions
  // ============================================
  /**
   * Gets completed transcriptions within a date range
   * Joins with bookmarks to get source information
   * CRITICAL: Filters by userId to ensure users only see their own data
   */
  async getCompletedTranscriptionsInRange(startDate, endDate, userId) {
    const userIdValue = userId !== void 0 ? userId : null;
    const query = this.db.query`
      SELECT
        t.bookmark_id,
        t.transcript,
        t.summary,
        t.deepgram_summary,
        b.title AS bookmark_title,
        t.duration::numeric::float AS duration,
        t.sentiment,
        t.created_at,
        b.source
      FROM transcriptions t
      INNER JOIN bookmarks b ON t.bookmark_id = b.id
      WHERE t.status = 'completed'
        AND t.created_at >= ${startDate}
        AND t.created_at <= ${endDate}
        AND b.user_id IS NOT DISTINCT FROM ${userIdValue}
      ORDER BY t.created_at DESC
    `;
    const transcriptions = [];
    for await (const transcription of query) {
      transcriptions.push(transcription);
    }
    return transcriptions;
  }
  /**
   * Gets completed web content within a date range
   * Returns DigestContentItem format for unified processing
   * CRITICAL: Filters by userId to ensure users only see their own data
   */
  async getCompletedWebContentInRange(startDate, endDate, userId) {
    const userIdValue = userId !== void 0 ? userId : null;
    const query = this.db.query`
      SELECT
        wc.bookmark_id,
        'article' as content_type,
        wc.summary,
        b.source,
        wc.page_title as title,
        wc.word_count,
        wc.estimated_reading_minutes as reading_minutes,
        wc.created_at
      FROM web_contents wc
      INNER JOIN bookmarks b ON wc.bookmark_id = b.id
      WHERE wc.status = 'completed'
        AND wc.summary IS NOT NULL
        AND wc.created_at >= ${startDate}
        AND wc.created_at <= ${endDate}
        AND b.user_id IS NOT DISTINCT FROM ${userIdValue}
      ORDER BY wc.created_at DESC
    `;
    const items = [];
    for await (const item of query) {
      items.push(item);
    }
    return items;
  }
};

// bookmarks/services/daily-digest.service.ts
import log3 from "encore.dev/log";
init_daily_digest_config();
var DailyDigestService = class {
  constructor(digestRepo) {
    this.digestRepo = digestRepo;
  }
  /**
   * Main orchestration method for generating a daily digest
   * @param options - Configuration for digest generation
   * @returns Generated daily digest
   */
  async generateDailyDigest(options) {
    const { date, userId, forceRegenerate } = options;
    const digestDateStr = formatDigestDate(date);
    log3.info("Starting daily digest generation", {
      digestDate: digestDateStr,
      userId: userId || "global",
      forceRegenerate
    });
    try {
      const existingDigest = await this.checkIfDigestExists(date, userId);
      if (existingDigest && !forceRegenerate) {
        if (existingDigest.status === "completed" /* COMPLETED */) {
          log3.info("Digest already exists and is completed, returning existing", {
            digestId: existingDigest.id,
            digestDate: digestDateStr
          });
          return existingDigest;
        }
        if (existingDigest.status === "processing" /* PROCESSING */) {
          log3.warn("Digest is currently being processed, returning existing", {
            digestId: existingDigest.id,
            digestDate: digestDateStr
          });
          return existingDigest;
        }
        log3.info("Existing digest found but not completed, regenerating", {
          digestId: existingDigest.id,
          status: existingDigest.status
        });
      }
      const { startDate, endDate } = this.calculateDateRange(date);
      log3.info("Calculated date range for digest", {
        digestDate: digestDateStr,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      const contentItems = await this.fetchContentForDate(
        startDate,
        endDate,
        userId
      );
      const audioItemCount = contentItems.filter((c) => c.content_type === "audio").length;
      const articleItemCount = contentItems.filter((c) => c.content_type === "article").length;
      log3.info("Fetched content for digest", {
        digestDate: digestDateStr,
        totalItems: contentItems.length,
        audioCount: audioItemCount,
        articleCount: articleItemCount
      });
      const bookmarkCount = contentItems.length;
      const sourcesBreakdown = this.calculateSourcesBreakdown(contentItems);
      const totalDuration = this.calculateTotalDuration(contentItems);
      log3.info("Calculated digest metadata", {
        digestDate: digestDateStr,
        bookmarkCount,
        sourcesBreakdown,
        totalDuration
      });
      let digest;
      if (existingDigest) {
        await this.digestRepo.markAsProcessing(existingDigest.id);
        digest = existingDigest;
      } else {
        digest = await this.digestRepo.create({
          digestDate: date,
          userId: userId || null,
          bookmarkCount,
          sourcesBreakdown,
          dateRangeStart: startDate,
          dateRangeEnd: endDate
        });
      }
      log3.info("Created/updated digest record", {
        digestId: digest.id,
        digestDate: digestDateStr,
        status: "processing"
      });
      const startTime = Date.now();
      const digestContent = await this.generateUnifiedSummary(contentItems, {
        digestDate: digestDateStr,
        totalItems: bookmarkCount,
        audioCount: audioItemCount,
        articleCount: articleItemCount
      });
      const processingDurationMs = Date.now() - startTime;
      const processingMetadata = {
        modelUsed: DAILY_DIGEST_CONFIG.openaiModel,
        summarizationStrategy: "map-reduce",
        processingDurationMs
      };
      await this.digestRepo.markAsCompleted(
        digest.id,
        digestContent,
        totalDuration,
        processingMetadata
      );
      log3.info("Daily digest generation completed", {
        digestId: digest.id,
        digestDate: digestDateStr,
        bookmarkCount,
        totalDuration
      });
      const completedDigest = await this.digestRepo.findByDate(date, userId);
      if (!completedDigest) {
        throw new Error("Failed to retrieve completed digest");
      }
      return completedDigest;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log3.error(error, "Daily digest generation failed", {
        digestDate: digestDateStr,
        userId: userId || "global",
        errorMessage
      });
      throw new Error(`Failed to generate daily digest: ${errorMessage}`);
    }
  }
  // ============================================
  // Private Helper Methods
  // ============================================
  /**
   * Checks if a digest already exists for the given date
   */
  async checkIfDigestExists(date, userId) {
    return await this.digestRepo.findByDate(date, userId);
  }
  /**
   * Calculates the date range for fetching transcriptions
   */
  calculateDateRange(date) {
    const digestDate = new Date(date);
    digestDate.setHours(0, 0, 0, 0);
    const startDate = new Date(digestDate);
    const endDate = new Date(digestDate);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  /**
   * Fetches all content (audio transcriptions + web content) for the given date range
   * Returns unified DigestContentItem format
   */
  async fetchContentForDate(startDate, endDate, userId) {
    const transcriptions = await this.digestRepo.getCompletedTranscriptionsInRange(
      startDate,
      endDate,
      userId
    );
    const webContent = await this.digestRepo.getCompletedWebContentInRange(
      startDate,
      endDate,
      userId
    );
    const transcriptionItems = transcriptions.map((t) => ({
      bookmark_id: t.bookmark_id,
      content_type: "audio",
      summary: t.summary || t.deepgram_summary || "",
      source: t.source,
      title: t.bookmark_title ?? null,
      duration: t.duration || void 0,
      sentiment: t.sentiment || void 0,
      created_at: t.created_at
    }));
    const allItems = [...transcriptionItems, ...webContent];
    log3.info("Fetched content for digest", {
      audioCount: transcriptionItems.length,
      articleCount: webContent.length,
      totalCount: allItems.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return allItems;
  }
  /**
   * Calculates breakdown of bookmarks by source
   * Works with unified DigestContentItem format (audio + web)
   */
  calculateSourcesBreakdown(items) {
    const breakdown = {};
    for (const item of items) {
      const source = item.source;
      breakdown[source] = (breakdown[source] || 0) + 1;
    }
    return breakdown;
  }
  /**
   * Calculates total duration of all audio content in seconds
   * Web content (articles) do not have duration
   */
  calculateTotalDuration(items) {
    return items.reduce((total, item) => {
      if (item.content_type === "audio" && item.duration) {
        return total + item.duration;
      }
      return total;
    }, 0);
  }
  // ============================================
  // Summarization Methods
  // ============================================
  /**
   * Generates a unified summary from all content (audio + web)
   * Uses map-reduce for intelligent synthesis across any volume
   *
   * @param contentItems - All completed content items (audio + web) for the date
   * @returns Unified digest summary text
   */
  async generateUnifiedSummary(contentItems, context) {
    if (contentItems.length === 0) {
      log3.info("No content items to summarize");
      return null;
    }
    log3.info("Generating unified summary with map-reduce", {
      digestDate: context.digestDate,
      contentItemCount: context.totalItems,
      audioCount: context.audioCount,
      articleCount: context.articleCount
    });
    try {
      const { secret: secret7 } = await import("encore.dev/config");
      const openaiApiKey3 = secret7("OpenAIAPIKey");
      const { MapReduceDigestService: MapReduceDigestService2 } = await Promise.resolve().then(() => (init_map_reduce_digest_service(), map_reduce_digest_service_exports));
      const mapReduceService = new MapReduceDigestService2(openaiApiKey3());
      const digest = await mapReduceService.generateDigest(contentItems, context);
      log3.info("Unified summary generated successfully", {
        digestDate: context.digestDate,
        contentItemCount: context.totalItems,
        audioCount: context.audioCount,
        articleCount: context.articleCount,
        digestLength: digest.length
      });
      return digest;
    } catch (error) {
      log3.error(error, "Failed to generate unified summary", {
        digestDate: context.digestDate,
        contentItemCount: context.totalItems,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  // ============================================
  // Helper Methods
  // ============================================
  /**
   * Gets a digest by date
   */
  async getDigestByDate(date, userId) {
    return await this.digestRepo.findByDate(date, userId);
  }
  /**
   * Lists digests with pagination
   */
  async listDigests(params) {
    return await this.digestRepo.list(params);
  }
};

// bookmarks/api-test.ts
var bookmarkRepo = new BookmarkRepository(db);
var dailyDigestRepo = new DailyDigestRepository(db);
var dailyDigestService = new DailyDigestService(dailyDigestRepo);
var createTest = api(
  { expose: true, method: "POST", path: "/test/bookmarks", auth: false },
  async (req) => {
    log4.info("TEST: Creating bookmark without auth", {
      url: req.url,
      source: req.source
    });
    const userId = req.userId || "550e8400-e29b-41d4-a716-446655440000";
    const source = req.source || "web" /* WEB */;
    const bookmark = await bookmarkRepo.create({
      user_id: userId,
      url: req.url,
      title: req.title || null,
      source,
      client_time: /* @__PURE__ */ new Date(),
      metadata: null
    });
    log4.info("TEST: Bookmark created, publishing event", {
      bookmarkId: bookmark.id,
      url: bookmark.url,
      source: bookmark.source
    });
    await bookmarkCreatedTopic.publish({
      bookmarkId: bookmark.id,
      url: bookmark.url,
      source: bookmark.source,
      title: bookmark.title || void 0
    });
    return {
      bookmarkId: bookmark.id,
      url: bookmark.url,
      source: bookmark.source,
      message: "Bookmark created and event published. Processing pipeline started."
    };
  }
);
var generateDigestTest = api(
  { expose: true, method: "POST", path: "/test/digests/generate", auth: false },
  async (req) => {
    log4.info("TEST: Generating daily digest without auth", {
      date: req.date,
      userId: req.userId
    });
    const userId = req.userId || "550e8400-e29b-41d4-a716-446655440000";
    const digestDate = req.date ? new Date(req.date) : /* @__PURE__ */ new Date();
    log4.info("TEST: Calling daily digest service", {
      digestDate: digestDate.toISOString().split("T")[0],
      userId
    });
    try {
      const digest = await dailyDigestService.generateDailyDigest({
        date: digestDate,
        userId,
        forceRegenerate: false
      });
      log4.info("TEST: Daily digest generated", {
        digestId: digest.id,
        digestDate: digest.digest_date,
        bookmarkCount: digest.bookmark_count
      });
      return {
        digest,
        message: digest.digest_content ? "Daily digest generated successfully" : "Daily digest scaffolding completed (summarization pending)"
      };
    } catch (error) {
      log4.error(error, "TEST: Failed to generate daily digest", {
        digestDate: digestDate.toISOString().split("T")[0],
        userId
      });
      throw error;
    }
  }
);

// bookmarks/api.ts
import { api as api2, APIError as APIError2 } from "encore.dev/api";

// encore.gen/internal/auth/auth.ts
import { getAuthData as _getAuthData } from "encore.dev/internal/codegen/auth";
function getAuthData() {
  return _getAuthData();
}

// bookmarks/api.ts
import log5 from "encore.dev/log";

// bookmarks/repositories/transcription.repository.ts
var TranscriptionRepository = class {
  constructor(db3) {
    this.db = db3;
  }
  /**
   * Creates a pending transcription record
   */
  async createPending(bookmarkId) {
    await this.db.exec`
      INSERT INTO transcriptions (bookmark_id, status)
      VALUES (${bookmarkId}, 'pending')
    `;
  }
  /**
   * Updates transcription status to processing
   */
  async markAsProcessing(bookmarkId) {
    await this.db.exec`
      UPDATE transcriptions
      SET status = 'processing', processing_started_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
  /**
   * Updates transcription status to failed with error message
   */
  async markAsFailed(bookmarkId, errorMessage) {
    await this.db.exec`
      UPDATE transcriptions
      SET
        status = 'failed',
        error_message = ${errorMessage},
        processing_completed_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
  /**
   * Finds a transcription by bookmark ID
   * NOTE: Excludes deepgram_response JSONB field due to Encore deserialization limitation
   */
  async findByBookmarkId(bookmarkId) {
    const row = await this.db.queryRow`
      SELECT
        id, bookmark_id, transcript, deepgram_summary, sentiment, sentiment_score,
        duration, confidence, summary, status, error_message,
        processing_started_at, processing_completed_at, created_at, updated_at
      FROM transcriptions
      WHERE bookmark_id = ${bookmarkId}
    `;
    return row ? { ...row, deepgram_response: null } : null;
  }
  // ============================================
  // Stage-Specific Update Methods
  // ============================================
  /**
   * Stage 2: Update transcription data after Deepgram processing
   */
  async updateTranscriptionData(bookmarkId, data) {
    await this.db.exec`
      UPDATE transcriptions
      SET
        transcript = ${data.transcript},
        deepgram_summary = ${data.deepgramSummary},
        sentiment = ${data.sentiment},
        sentiment_score = ${data.sentimentScore},
        deepgram_response = ${data.deepgramResponse},
        duration = ${data.duration},
        confidence = ${data.confidence},
        transcription_method = 'deepgram',
        status = 'processing'
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
  /**
   * Stage 3: Update summary after OpenAI processing
   */
  async updateSummary(bookmarkId, summary) {
    await this.db.exec`
      UPDATE transcriptions
      SET
        summary = ${summary},
        status = 'completed',
        processing_completed_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
  // ============================================
  // Gemini-Specific Methods
  // ============================================
  /**
   * Stage 2 (Gemini): Update transcription data after Gemini processing
   * Simpler than Deepgram - Gemini provides just transcript, no audio intelligence
   */
  async updateGeminiTranscriptionData(bookmarkId, data) {
    await this.db.exec`
      UPDATE transcriptions
      SET
        transcript = ${data.transcript},
        confidence = ${data.confidence},
        transcription_method = 'gemini',
        status = 'processing'
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
};

// bookmarks/api.ts
init_daily_digest_config();
var bookmarkRepo2 = new BookmarkRepository(db);
var transcriptionRepo = new TranscriptionRepository(db);
var dailyDigestRepo2 = new DailyDigestRepository(db);
var dailyDigestService2 = new DailyDigestService(dailyDigestRepo2);
function toTranscriptionDetails(t) {
  return {
    transcript: t.transcript,
    deepgram_summary: t.deepgram_summary,
    summary: t.summary,
    sentiment: t.sentiment,
    sentiment_score: t.sentiment_score,
    duration: t.duration,
    confidence: t.confidence,
    status: t.status,
    error_message: t.error_message,
    created_at: t.created_at,
    updated_at: t.updated_at
  };
}
var create2 = api2(
  { expose: true, method: "POST", path: "/bookmarks", auth: true },
  async (req) => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError2.unauthenticated("Authentication required");
    }
    const userId = auth2.userID;
    if (!req.url || !req.client_time) {
      throw APIError2.invalidArgument("url and client_time are required");
    }
    const source = req.source || "web" /* WEB */;
    const bookmark = await bookmarkRepo2.create({
      user_id: userId,
      url: req.url,
      title: req.title || null,
      source,
      client_time: req.client_time,
      metadata: req.metadata || null
    });
    log5.info("Bookmark created, publishing event for classification", {
      bookmarkId: bookmark.id,
      url: bookmark.url,
      source: bookmark.source
    });
    try {
      const messageId = await bookmarkCreatedTopic.publish({
        bookmarkId: bookmark.id,
        url: bookmark.url,
        source: bookmark.source,
        title: bookmark.title || void 0
      });
      log5.info("Successfully published bookmark-created event", {
        bookmarkId: bookmark.id,
        messageId
      });
    } catch (error) {
      log5.error(error, "Failed to publish bookmark-created event", {
        bookmarkId: bookmark.id
      });
    }
    return { bookmark };
  }
);
var get2 = api2(
  { expose: true, method: "GET", path: "/bookmarks/:id", auth: true },
  async (req) => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError2.unauthenticated("Authentication required");
    }
    const userId = auth2.userID;
    const bookmark = await bookmarkRepo2.findById(req.id, userId);
    if (!bookmark) {
      throw APIError2.notFound(`Bookmark with id ${req.id} not found`);
    }
    return { bookmark };
  }
);
var list2 = api2(
  { expose: true, method: "GET", path: "/bookmarks", auth: true },
  async (req) => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError2.unauthenticated("Authentication required");
    }
    const userId = auth2.userID;
    const limit = req.limit || 50;
    const offset = req.offset || 0;
    const { bookmarks, total } = await bookmarkRepo2.list({
      userId,
      limit,
      offset,
      source: req.source
    });
    return { bookmarks, total };
  }
);
var update2 = api2(
  { expose: true, method: "PUT", path: "/bookmarks/:id", auth: true },
  async (req) => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError2.unauthenticated("Authentication required");
    }
    const userId = auth2.userID;
    if (req.url === void 0 && req.title === void 0 && req.source === void 0 && req.metadata === void 0) {
      throw APIError2.invalidArgument("No fields to update");
    }
    const bookmark = await bookmarkRepo2.update(req.id, userId, {
      url: req.url,
      title: req.title,
      source: req.source,
      metadata: req.metadata
    });
    return { bookmark };
  }
);
var remove2 = api2(
  { expose: true, method: "DELETE", path: "/bookmarks/:id", auth: true },
  async (req) => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError2.unauthenticated("Authentication required");
    }
    const userId = auth2.userID;
    await bookmarkRepo2.delete(req.id, userId);
    return { success: true };
  }
);
var getDetails2 = api2(
  { expose: true, method: "GET", path: "/bookmarks/:id/details", auth: true },
  async (req) => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError2.unauthenticated("Authentication required");
    }
    const userId = auth2.userID;
    const bookmark = await bookmarkRepo2.findById(req.id, userId);
    if (!bookmark) {
      throw APIError2.notFound(`Bookmark with id ${req.id} not found`);
    }
    const transcription = await transcriptionRepo.findByBookmarkId(req.id);
    log5.info("Fetched bookmark details", {
      bookmarkId: req.id,
      source: bookmark.source,
      hasTranscription: !!transcription
    });
    return {
      bookmark,
      transcription: transcription ? toTranscriptionDetails(transcription) : null
    };
  }
);
var generateDailyDigest2 = api2(
  { expose: true, method: "POST", path: "/digests/generate", auth: true },
  async (req) => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError2.unauthenticated("Authentication required");
    }
    const userId = auth2.userID;
    let digestDate;
    if (req?.date) {
      try {
        digestDate = parseDigestDate(req.date);
      } catch (error) {
        throw APIError2.invalidArgument("Invalid date format. Use YYYY-MM-DD");
      }
    } else {
      const { digestDate: yesterday } = getDigestDateRange();
      digestDate = yesterday;
    }
    log5.info("Generating daily digest", {
      digestDate: digestDate.toISOString().split("T")[0],
      userId
    });
    try {
      const digest = await dailyDigestService2.generateDailyDigest({
        date: digestDate,
        userId,
        forceRegenerate: false
      });
      return {
        digest,
        message: digest.digest_content ? "Daily digest generated successfully" : "Daily digest scaffolding completed (summarization pending)"
      };
    } catch (error) {
      log5.error(error, "Failed to generate daily digest", {
        digestDate: digestDate.toISOString().split("T")[0]
      });
      throw APIError2.internal(
        `Failed to generate daily digest: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);
var getDailyDigest2 = api2(
  { expose: true, method: "GET", path: "/digests/:date", auth: true },
  async (req) => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError2.unauthenticated("Authentication required");
    }
    const userId = auth2.userID;
    let digestDate;
    try {
      digestDate = parseDigestDate(req.date);
    } catch (error) {
      throw APIError2.invalidArgument("Invalid date format. Use YYYY-MM-DD");
    }
    log5.info("Fetching daily digest", {
      digestDate: req.date,
      userId
    });
    const digest = await dailyDigestService2.getDigestByDate(
      digestDate,
      userId
    );
    if (!digest) {
      log5.info("Daily digest not found", {
        digestDate: req.date,
        userId
      });
    }
    return { digest };
  }
);
var listDailyDigests2 = api2(
  { expose: true, method: "GET", path: "/digests", auth: true },
  async (req) => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError2.unauthenticated("Authentication required");
    }
    const userId = auth2.userID;
    const limit = req.limit || 30;
    const offset = req.offset || 0;
    log5.info("Listing daily digests", {
      limit,
      offset,
      userId
    });
    const { digests, total } = await dailyDigestService2.listDigests({
      limit,
      offset,
      userId
    });
    return { digests, total };
  }
);
var generateYesterdaysDigest2 = api2(
  { expose: false, method: "POST", path: "/digests/generate-yesterday" },
  async () => {
    const { digestDate } = getDigestDateRange();
    const digestDateStr = digestDate.toISOString().split("T")[0];
    log5.info("Cron job triggered: Generating yesterday's digest for all users", {
      digestDate: digestDateStr
    });
    try {
      const { users } = await init_clients().then(() => clients_exports);
      const { userIds } = await users.getUserIds();
      log5.info("Fetched users for digest generation", {
        digestDate: digestDateStr,
        userCount: userIds.length
      });
      const results = {
        total: userIds.length,
        successful: 0,
        failed: 0,
        errors: []
      };
      for (const userId of userIds) {
        try {
          await dailyDigestService2.generateDailyDigest({
            date: digestDate,
            userId,
            forceRegenerate: false
          });
          results.successful++;
          log5.info("Generated digest for user", {
            userId,
            digestDate: digestDateStr
          });
        } catch (error) {
          results.failed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.errors.push({ userId, error: errorMessage });
          log5.error(error, "Failed to generate digest for user", {
            userId,
            digestDate: digestDateStr,
            errorMessage
          });
        }
      }
      log5.info("Cron job completed: Daily digest generation summary", {
        digestDate: digestDateStr,
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        successRate: `${(results.successful / results.total * 100).toFixed(1)}%`
      });
      if (results.failed === results.total && results.total > 0) {
        throw new Error(
          `All ${results.total} digest generation attempts failed`
        );
      }
      const firstUserId = userIds[0];
      const digest = firstUserId ? await dailyDigestService2.getDigestByDate(digestDate, firstUserId) : null;
      return {
        digest: digest || {},
        // Placeholder for cron job response
        message: `Cron job completed: Generated ${results.successful}/${results.total} digests successfully`
      };
    } catch (error) {
      log5.error(error, "Cron job failed to generate yesterday's digest", {
        digestDate: digestDateStr
      });
      throw APIError2.internal(
        `Failed to generate yesterday's digest: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

// users/api.ts
import { api as api3, APIError as APIError3 } from "encore.dev/api";
import log6 from "encore.dev/log";

// users/db.ts
import { SQLDatabase as SQLDatabase2 } from "encore.dev/storage/sqldb";
var db2 = new SQLDatabase2("users", {
  migrations: "./migrations"
});

// users/repositories/user.repository.ts
var UserRepository = class {
  constructor(db3) {
    this.db = db3;
  }
  /**
   * Create a new user in the database
   * Called after Supabase user creation to store additional user data
   * @param data User data including Supabase UUID, email, and optional name
   * @returns The created user
   * @throws Error if user creation fails (e.g., duplicate id/email)
   */
  async create(data) {
    const row = await this.db.queryRow`
      INSERT INTO users (id, email, name, migrated_to_supabase)
      VALUES (${data.id}, ${data.email}, ${data.name || null}, TRUE)
      RETURNING *
    `;
    if (!row) {
      throw new Error("Failed to create user");
    }
    return row;
  }
  /**
   * Find a user by their ID (UUID from Supabase)
   * @param id User UUID
   * @returns User if found, null otherwise
   */
  async findById(id) {
    return await this.db.queryRow`
      SELECT * FROM users WHERE id = ${id}
    ` || null;
  }
  /**
   * Find a user by their email address
   * @param email Email address
   * @returns User if found, null otherwise
   */
  async findByEmail(email) {
    return await this.db.queryRow`
      SELECT * FROM users WHERE email = ${email}
    ` || null;
  }
  /**
   * Alias for findById for backward compatibility
   * Used during Supabase JWT authentication
   * @param supabaseUserId Supabase user UUID
   * @returns User if found, null otherwise
   */
  async findBySupabaseId(supabaseUserId) {
    return this.findById(supabaseUserId);
  }
  /**
   * Check if a user exists with the given email
   * @param email Email address
   * @returns true if user exists, false otherwise
   */
  async existsByEmail(email) {
    const row = await this.db.queryRow`
      SELECT COUNT(*) as count FROM users WHERE email = ${email}
    `;
    return row ? row.count > 0 : false;
  }
  /**
   * Check if a user exists with the given ID
   * @param id User UUID
   * @returns true if user exists, false otherwise
   */
  async existsById(id) {
    const row = await this.db.queryRow`
      SELECT COUNT(*) as count FROM users WHERE id = ${id}
    `;
    return row ? row.count > 0 : false;
  }
  /**
   * Update user information
   * @param id User UUID
   * @param data Partial user data to update
   * @returns Updated user
   * @throws Error if user not found
   */
  async update(id, data) {
    const updates = [];
    if (data.email !== void 0) {
      updates.push("email");
    }
    if (data.name !== void 0) {
      updates.push("name");
    }
    if (updates.length === 0) {
      throw new Error("No fields to update");
    }
    let query;
    if (data.email !== void 0 && data.name !== void 0) {
      query = this.db.queryRow`
        UPDATE users
        SET email = ${data.email}, name = ${data.name}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (data.email !== void 0) {
      query = this.db.queryRow`
        UPDATE users
        SET email = ${data.email}
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      query = this.db.queryRow`
        UPDATE users
        SET name = ${data.name}
        WHERE id = ${id}
        RETURNING *
      `;
    }
    const row = await query;
    if (!row) {
      throw new Error(`User with id ${id} not found`);
    }
    return row;
  }
  /**
   * Delete a user by ID
   * @param id User UUID
   * @throws Error if user not found
   */
  async delete(id) {
    await this.db.exec`
      DELETE FROM users WHERE id = ${id}
    `;
  }
  /**
   * List all user IDs
   * Used by cron jobs and batch operations
   * @returns Array of user UUIDs
   */
  async listAllUserIds() {
    const query = this.db.query`
      SELECT id FROM users ORDER BY created_at ASC
    `;
    const userIds = [];
    for await (const row of query) {
      userIds.push(row.id);
    }
    return userIds;
  }
};

// users/api.ts
var userRepo = new UserRepository(db2);
var me2 = api3(
  { expose: true, method: "GET", path: "/users/me", auth: true },
  async () => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError3.unauthenticated("Authentication required");
    }
    try {
      const user = await userRepo.findById(auth2.userID);
      if (!user) {
        log6.warn("User not found in local database", {
          userId: auth2.userID,
          email: auth2.email
        });
        throw new Error(
          `User ${auth2.userID} authenticated with Supabase but not found in local database. User may need to be created.`
        );
      }
      log6.info("User fetched current user info", {
        userId: user.id
      });
      const safeUser = {
        id: user.id,
        // UUID from Supabase
        email: user.email,
        name: user.name,
        migrated_to_supabase: user.migrated_to_supabase,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
      return { user: safeUser };
    } catch (error) {
      log6.error(error, "Failed to fetch current user", {
        userId: auth2.userID
      });
      throw APIError3.notFound("User not found in local database");
    }
  }
);
var updateProfile2 = api3(
  { expose: true, method: "PATCH", path: "/users/me", auth: true },
  async (req) => {
    const auth2 = getAuthData();
    if (!auth2) {
      throw APIError3.unauthenticated("Authentication required");
    }
    try {
      if (req.name === void 0) {
        throw APIError3.invalidArgument(
          "At least one field must be provided for update"
        );
      }
      const updatedUser = await userRepo.update(auth2.userID, {
        name: req.name
      });
      log6.info("User updated profile", {
        userId: updatedUser.id,
        updatedFields: Object.keys(req)
      });
      const safeUser = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        migrated_to_supabase: updatedUser.migrated_to_supabase,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at
      };
      return { user: safeUser };
    } catch (error) {
      log6.error(error, "Failed to update user profile", {
        userId: auth2.userID
      });
      if (error instanceof APIError3) {
        throw error;
      }
      throw APIError3.internal("Failed to update user profile");
    }
  }
);
var getUserIds2 = api3(
  { expose: false, method: "GET", path: "/users/ids", auth: false },
  async () => {
    try {
      const userIds = await userRepo.listAllUserIds();
      log6.info("Fetched all user IDs for batch operation", {
        count: userIds.length
      });
      return { userIds };
    } catch (error) {
      log6.error(error, "Failed to fetch user IDs");
      throw APIError3.internal("Failed to fetch user IDs");
    }
  }
);

// users/webhooks.ts
import { api as api4 } from "encore.dev/api";
import log7 from "encore.dev/log";
var userRepo2 = new UserRepository(db2);
var userCreated2 = api4(
  {
    expose: true,
    method: "POST",
    path: "/webhooks/auth/user-created",
    auth: false
    // No auth required for webhooks
  },
  async (payload) => {
    try {
      log7.info("Received Custom Access Token hook", {
        userId: payload.user_id,
        authMethod: payload.authentication_method
      });
      const userId = payload.user_id;
      const email = payload.claims.email;
      const name = payload.claims.user_metadata?.name;
      const existingUser = await userRepo2.findById(userId);
      if (existingUser) {
        log7.info("User already exists in local database", {
          userId,
          email
        });
        return {
          claims: {
            ...payload.claims,
            local_db_synced: true
          }
        };
      }
      const user = await userRepo2.create({
        id: userId,
        email,
        name
      });
      log7.info("User created in local database", {
        userId: user.id,
        email: user.email
      });
      return {
        claims: {
          ...payload.claims,
          local_db_synced: true
        }
      };
    } catch (error) {
      log7.error(error, "Failed to process Custom Access Token hook", {
        userId: payload.user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      return { claims: payload.claims };
    }
  }
);

// bookmarks/processors/audio-download.processor.ts
import { Subscription } from "encore.dev/pubsub";
import { secret as secret2 } from "encore.dev/config";
import log11 from "encore.dev/log";

// bookmarks/events/bookmark-source-classified.events.ts
import { Topic as Topic2 } from "encore.dev/pubsub";
var bookmarkSourceClassifiedTopic = new Topic2(
  "bookmark-source-classified",
  {
    deliveryGuarantee: "at-least-once"
  }
);

// bookmarks/events/audio-downloaded.events.ts
import { Topic as Topic3 } from "encore.dev/pubsub";
var audioDownloadedTopic = new Topic3(
  "audio-downloaded",
  {
    deliveryGuarantee: "at-least-once"
  }
);

// bookmarks/events/audio-transcribed.events.ts
import { Topic as Topic4 } from "encore.dev/pubsub";
var audioTranscribedTopic = new Topic4(
  "audio-transcribed",
  {
    deliveryGuarantee: "at-least-once"
  }
);

// bookmarks/services/podcast-downloader.service.ts
import { spawn } from "child_process";
import fs from "fs";
import log8 from "encore.dev/log";

// bookmarks/storage.ts
import { Bucket } from "encore.dev/storage/objects";
var audioFilesBucket = new Bucket("audio-files", {
  versioned: false
});

// bookmarks/utils/podcast-url.util.ts
function parsePodcastUrl(url) {
  const appleMatch = url.match(/podcasts\.apple\.com.*\/id(\d+)/);
  if (appleMatch) {
    return {
      platform: "apple",
      showId: appleMatch[1]
    };
  }
  const googleMatch = url.match(/podcasts\.google\.com\/feed\/([^\/\?]+)/);
  if (googleMatch) {
    try {
      const feedUrl = Buffer.from(googleMatch[1], "base64").toString("utf-8");
      new URL(feedUrl);
      return { platform: "google", feedUrl };
    } catch (error) {
      throw new Error(
        `Invalid Google Podcasts URL format: failed to decode feed URL (${error instanceof Error ? error.message : String(error)})`
      );
    }
  }
  if (url.includes(".xml") || url.includes("/feed") || url.includes("/rss")) {
    return { platform: "rss", feedUrl: url };
  }
  return { platform: "unknown" };
}
async function getApplePodcastRss(showId) {
  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${showId}&entity=podcast`
  );
  if (!response.ok) {
    throw new Error(
      `iTunes API error: ${response.status} ${response.statusText}`
    );
  }
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(
      `No podcast found for Apple Podcasts ID: ${showId}`
    );
  }
  const feedUrl = data.results[0]?.feedUrl;
  if (!feedUrl) {
    throw new Error("RSS feed not found for this Apple Podcast");
  }
  return feedUrl;
}

// bookmarks/services/podcast-downloader.service.ts
import parsePodcast from "node-podcast-parser";
import ogs from "open-graph-scraper";
import fuzzysort from "fuzzysort";
var MAX_FILE_SIZE = 500 * 1024 * 1024;
var DOWNLOAD_TIMEOUT = 12e4;
var FETCH_TIMEOUT = 3e4;
var MIN_FUZZY_MATCH_SCORE = -1e3;
async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}
var PodcastDownloaderService = class {
  /**
   * Downloads audio from podcast episode and uploads to bucket
   * Full flow: Episode URL → RSS feed → Episode matching → Audio download → Bucket upload
   * @param episodeUrl - Podcast episode URL (or RSS feed URL for latest episode)
   * @param bookmarkId - Bookmark ID (for unique bucket key)
   * @returns Bucket key for the uploaded audio file
   * @throws Error if download or upload fails
   */
  async downloadAndUpload(episodeUrl, bookmarkId) {
    log8.info("Processing podcast episode", { episodeUrl, bookmarkId });
    const rssFeedUrl = await this.getRssFeedUrl(episodeUrl);
    log8.info("Resolved RSS feed URL", { rssFeedUrl, bookmarkId });
    const episodeTitle = await this.getEpisodeTitle(episodeUrl);
    log8.info("Extracted episode title", { episodeTitle, bookmarkId });
    const audioUrl = await this.findEpisodeAudioUrl(rssFeedUrl, episodeTitle);
    log8.info("Found episode audio URL", { audioUrl, bookmarkId });
    return await this.downloadAudioFromUrl(audioUrl, bookmarkId);
  }
  /**
   * Converts episode URL to RSS feed URL based on platform
   * @param episodeUrl - Podcast episode or feed URL
   * @returns RSS feed URL
   * @throws Error if platform not supported or RSS feed not found
   */
  async getRssFeedUrl(episodeUrl) {
    const urlInfo = parsePodcastUrl(episodeUrl);
    switch (urlInfo.platform) {
      case "rss":
        return urlInfo.feedUrl;
      case "apple":
        return await getApplePodcastRss(urlInfo.showId);
      case "google":
        return urlInfo.feedUrl;
      default:
        throw new Error(`Unsupported podcast URL format: ${episodeUrl}`);
    }
  }
  /**
   * Extracts episode title from URL using OpenGraph metadata
   * Falls back to latest episode if extraction fails (e.g., Apple Podcasts blocks scraping)
   * @param episodeUrl - Podcast episode URL
   * @returns Episode title, or empty string to use latest episode
   */
  async getEpisodeTitle(episodeUrl) {
    if (episodeUrl.includes(".xml") || episodeUrl.includes("/feed/") || episodeUrl.includes("/rss/")) {
      return "";
    }
    try {
      const { result, error: ogsError } = await ogs({
        url: episodeUrl,
        timeout: 1e4,
        // 10 second timeout
        fetchOptions: {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        }
      });
      if (ogsError) {
        throw new Error(`OpenGraph scraping failed: ${result.error || "Unknown error"}`);
      }
      const title = result.ogTitle || result.twitterTitle || "";
      if (!title) {
        throw new Error("No title found in OpenGraph metadata");
      }
      return this.cleanEpisodeTitle(title);
    } catch (error) {
      const errorMsg = error.error || error.message || String(error);
      log8.warn("Failed to extract episode title, will use latest episode from RSS feed", {
        episodeUrl,
        errorMsg
      });
      return "";
    }
  }
  /**
   * Cleans episode title by removing common show name suffixes
   * Example: "Episode 123: Title - Show Name" → "Episode 123: Title"
   */
  cleanEpisodeTitle(title) {
    return title.replace(/\s*[-–|]\s*[^-–|]+\s*(podcast|show)\s*$/i, "").trim();
  }
  /**
   * Finds episode audio URL by fuzzy matching title in RSS feed
   * @param rssFeedUrl - Podcast RSS feed URL
   * @param episodeTitle - Episode title to search for (empty string = latest episode)
   * @returns Direct audio file URL
   * @throws Error if episode not found or RSS parsing fails
   */
  async findEpisodeAudioUrl(rssFeedUrl, episodeTitle) {
    const response = await fetchWithTimeout(rssFeedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }
    const xmlData = await response.text();
    const podcast = await new Promise(
      (resolve, reject) => {
        parsePodcast(xmlData, (err, data) => {
          if (err)
            reject(err);
          else
            resolve(data);
        });
      }
    );
    if (!podcast.episodes || podcast.episodes.length === 0) {
      throw new Error("No episodes found in RSS feed");
    }
    if (!episodeTitle) {
      log8.info("Using latest episode from RSS feed", { rssFeedUrl });
      const latestEpisode = podcast.episodes[0];
      if (!latestEpisode.enclosure?.url) {
        throw new Error("Latest episode has no audio URL");
      }
      log8.info("Selected latest episode", {
        title: latestEpisode.title,
        audioUrl: latestEpisode.enclosure.url
      });
      return latestEpisode.enclosure.url;
    }
    const episodeTitles = podcast.episodes.map((ep) => ep.title);
    const results = fuzzysort.go(episodeTitle, episodeTitles, {
      threshold: MIN_FUZZY_MATCH_SCORE,
      limit: 5
      // Get top 5 matches for logging
    });
    if (results.length === 0 || results[0].score < MIN_FUZZY_MATCH_SCORE) {
      log8.warn("No good episode match found", {
        searchTitle: episodeTitle,
        availableTitles: episodeTitles.slice(0, 5),
        bestScore: results[0]?.score
      });
      throw new Error(
        `Episode "${episodeTitle}" not found in RSS feed (no close matches)`
      );
    }
    const bestMatchIndex = results[0].target ? episodeTitles.indexOf(results[0].target) : 0;
    const matchedEpisode = podcast.episodes[bestMatchIndex];
    if (!matchedEpisode.enclosure?.url) {
      throw new Error("Matched episode has no audio URL");
    }
    log8.info("Matched episode by title", {
      searchTitle: episodeTitle,
      matchedTitle: matchedEpisode.title,
      score: results[0].score,
      audioUrl: matchedEpisode.enclosure.url,
      alternativeMatches: results.slice(1, 3).map((r) => ({
        title: r.target,
        score: r.score
      }))
    });
    return matchedEpisode.enclosure.url;
  }
  /**
   * Downloads audio from direct URL to temp file, uploads to bucket, and cleans up
   * Secure implementation using spawn to prevent command injection
   * @param audioUrl - Direct URL to audio file
   * @param bookmarkId - Bookmark ID for unique bucket key
   * @returns Bucket key for uploaded audio
   * @throws Error if download or upload fails
   */
  async downloadAudioFromUrl(audioUrl, bookmarkId) {
    const tempPath = `/tmp/podcast-${bookmarkId}.mp3`;
    const bucketKey = `audio-${bookmarkId}-podcast.mp3`;
    let parsedUrl;
    try {
      parsedUrl = new URL(audioUrl);
    } catch {
      throw new Error(`Invalid audio URL format: ${audioUrl}`);
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only HTTP(S) allowed.`);
    }
    log8.info("Downloading podcast audio", {
      audioUrl,
      bookmarkId,
      tempPath,
      bucketKey
    });
    try {
      await this.downloadWithCurl(audioUrl, tempPath);
      if (!fs.existsSync(tempPath)) {
        throw new Error("Audio file not downloaded");
      }
      const fileSize = fs.statSync(tempPath).size;
      if (fileSize === 0) {
        fs.unlinkSync(tempPath);
        throw new Error("Downloaded file is empty");
      }
      if (fileSize > MAX_FILE_SIZE) {
        fs.unlinkSync(tempPath);
        throw new Error(
          `Audio file too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`
        );
      }
      log8.info("Audio download completed, uploading to bucket", {
        bookmarkId,
        tempPath,
        fileSize,
        bucketKey
      });
      const audioBuffer = fs.readFileSync(tempPath);
      await audioFilesBucket.upload(bucketKey, audioBuffer, {
        contentType: "audio/mpeg"
      });
      log8.info("Audio uploaded to bucket", {
        bookmarkId,
        bucketKey,
        size: fileSize
      });
      fs.unlinkSync(tempPath);
      return bucketKey;
    } catch (error) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        log8.warn(cleanupError, "Failed to clean up temp file", { tempPath });
      }
      log8.error(error, "Failed to download and upload podcast audio", {
        audioUrl,
        bookmarkId
      });
      throw new Error(
        `Failed to download podcast audio: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  /**
   * Downloads file using curl via spawn (secure, no shell injection)
   * @param url - URL to download
   * @param outputPath - Where to save the file
   */
  downloadWithCurl(url, outputPath) {
    return new Promise((resolve, reject) => {
      const curl = spawn("curl", [
        "-L",
        // Follow redirects
        "-f",
        // Fail on HTTP errors
        "--max-time",
        String(DOWNLOAD_TIMEOUT / 1e3),
        // Timeout in seconds
        "--max-filesize",
        String(MAX_FILE_SIZE),
        // Max file size
        "-o",
        outputPath,
        // Output file
        url
        // URL (passed as separate argument, not interpolated)
      ]);
      let stderr = "";
      curl.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      curl.on("error", (error) => {
        reject(new Error(`curl spawn error: ${error.message}`));
      });
      curl.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`curl exited with code ${code}: ${stderr}`));
        } else {
          if (stderr) {
            log8.debug("curl stderr output", { stderr });
          }
          resolve();
        }
      });
    });
  }
};

// bookmarks/services/youtube-downloader.service.ts
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import fs2 from "fs";
import log9 from "encore.dev/log";

// bookmarks/config/transcription.config.ts
import os from "os";
import path from "path";
var DEEPGRAM_CONFIG = {
  model: "nova-3",
  smartFormat: true,
  paragraphs: true,
  punctuate: true,
  diarize: true,
  sentiment: true,
  summarize: "v2",
  intents: true,
  topics: true,
  language: "en"
};
var OPENAI_CONFIG = {
  model: "gpt-4.1-mini",
  temperature: 0.7,
  maxOutputTokens: 500,
  instructions: "You are a helpful assistant that creates concise, informative summaries of video transcripts. Focus on the main points and key takeaways."
};
var YOUTUBE_CONFIG = {
  audioFormat: "mp3",
  audioQuality: "0",
  // Best quality
  getTempPath: (videoId) => path.join(os.tmpdir(), `${videoId}.mp3`)
};
var YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/,
  /youtube\.com\/embed\/([^&\s?]+)/,
  /youtube\.com\/v\/([^&\s?]+)/
];
var GEMINI_CONFIG = {
  model: "gemini-2.5-flash",
  // Stable Gemini 2.5 Flash with API key support
  maxVideoLength: 7200,
  // 2 hours max (Gemini limit)
  timeout: 12e4,
  // 2 minutes timeout
  retries: 2
  // Retry twice on failure
};

// bookmarks/utils/youtube-url.util.ts
function extractYouTubeVideoId(url) {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}
function buildYouTubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// bookmarks/services/youtube-downloader.service.ts
var exec = promisify(execCallback);
function findYtDlpPath() {
  const paths = [
    "/opt/homebrew/bin/yt-dlp",
    // ARM Mac (M1/M2/M3)
    "/usr/local/bin/yt-dlp",
    // Intel Mac
    "yt-dlp"
    // Fallback to PATH
  ];
  for (const path2 of paths) {
    try {
      if (path2.startsWith("/") && fs2.existsSync(path2)) {
        return path2;
      }
    } catch {
    }
  }
  return "yt-dlp";
}
var YT_DLP_PATH = findYtDlpPath();
log9.info("YouTube downloader initialized", {
  ytDlpPath: YT_DLP_PATH,
  isFullPath: YT_DLP_PATH.startsWith("/")
});
var YouTubeDownloaderService = class {
  /**
   * Downloads audio from YouTube and uploads to bucket
   * @param videoId - YouTube video ID
   * @param bookmarkId - Bookmark ID (for unique bucket key)
   * @returns Bucket key for the uploaded audio file
   * @throws Error if download or upload fails
   */
  async downloadAndUpload(videoId, bookmarkId) {
    const youtubeUrl = buildYouTubeUrl(videoId);
    const tempPath = YOUTUBE_CONFIG.getTempPath(videoId);
    const bucketKey = `audio-${bookmarkId}-${videoId}.mp3`;
    log9.info("Downloading YouTube audio with yt-dlp", {
      videoId,
      bookmarkId,
      youtubeUrl,
      tempPath,
      bucketKey
    });
    try {
      const { stdout, stderr } = await exec(
        `${YT_DLP_PATH} -x --audio-format ${YOUTUBE_CONFIG.audioFormat} --audio-quality ${YOUTUBE_CONFIG.audioQuality} -o "${tempPath}" "${youtubeUrl}"`
      );
      if (stderr && !stderr.includes("Deleting original file")) {
        log9.warn("yt-dlp stderr output", { stderr });
      }
      const fileSize = fs2.statSync(tempPath).size;
      log9.info("Audio download completed, uploading to bucket", {
        videoId,
        bookmarkId,
        tempPath,
        fileSize,
        bucketKey
      });
      const audioBuffer = fs2.readFileSync(tempPath);
      await audioFilesBucket.upload(bucketKey, audioBuffer, {
        contentType: "audio/mpeg"
      });
      log9.info("Audio uploaded to bucket", {
        videoId,
        bookmarkId,
        bucketKey,
        size: audioBuffer.length
      });
      fs2.unlinkSync(tempPath);
      return bucketKey;
    } catch (error) {
      try {
        if (fs2.existsSync(tempPath)) {
          fs2.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        log9.warn(cleanupError, "Failed to clean up temp file", { tempPath });
      }
      log9.error(error, "Failed to download and upload YouTube audio", {
        videoId,
        bookmarkId
      });
      throw new Error(
        `Failed to download YouTube audio: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
};

// bookmarks/services/gemini.service.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import log10 from "encore.dev/log";
var GeminiService = class {
  client;
  constructor(apiKey) {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Gemini API key is empty or undefined");
    }
    const maskedKey = apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "***masked***";
    log10.info("Initializing Gemini service", {
      apiKeyLength: apiKey.length,
      apiKeyPreview: maskedKey,
      sdkVersion: "@google/generative-ai v0.24.1"
    });
    this.client = new GoogleGenerativeAI(apiKey);
  }
  /**
   * Transcribes a YouTube video using Gemini 2.5 Flash
   *
   * @param videoUrl - Full YouTube URL (e.g., https://youtube.com/watch?v=VIDEO_ID)
   * @param videoId - YouTube video ID (for logging)
   * @returns Transcript with metadata or error
   */
  async transcribeYouTubeVideo(videoUrl, videoId) {
    const startTime = Date.now();
    try {
      log10.info("Starting Gemini transcription", {
        videoId,
        videoUrl,
        model: GEMINI_CONFIG.model
      });
      const model = this.client.getGenerativeModel({
        model: GEMINI_CONFIG.model
      });
      const prompt = `Please provide a complete, accurate transcript of this YouTube video.

Requirements:
1. Include ALL spoken words verbatim
2. Use proper punctuation and paragraph breaks
3. Do NOT include timestamps or speaker labels
4. Do NOT add commentary or analysis
5. Just provide the raw transcript text

Return ONLY the transcript, nothing else.`;
      const result = await Promise.race([
        model.generateContent([
          prompt,
          {
            fileData: {
              mimeType: "video/*",
              // Generic video MIME type for YouTube URLs
              fileUri: videoUrl
            }
          }
        ]),
        this.createTimeout(GEMINI_CONFIG.timeout)
      ]);
      if (result === "TIMEOUT") {
        throw new Error("TIMEOUT" /* TIMEOUT */);
      }
      const response = result.response;
      const transcript = response.text().trim();
      if (!transcript || transcript.length < 10) {
        throw new Error("Empty or invalid transcript received");
      }
      const processingTime = Date.now() - startTime;
      log10.info("Gemini transcription successful", {
        videoId,
        transcriptLength: transcript.length,
        processingTime,
        wordsCount: transcript.split(/\s+/).length
      });
      return {
        transcript,
        confidence: 0.95,
        // Gemini is highly accurate
        processingTime,
        method: "gemini"
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = this.parseError(error);
      const errorType = this.classifyError(error);
      const errorDetails = {
        videoId,
        videoUrl,
        model: GEMINI_CONFIG.model,
        errorMessage,
        errorType,
        processingTime
      };
      if (error instanceof Error) {
        errorDetails.errorName = error.name;
        errorDetails.errorStack = error.stack;
        const anyError = error;
        if (anyError.response) {
          errorDetails.responseStatus = anyError.response.status;
          errorDetails.responseStatusText = anyError.response.statusText;
          errorDetails.responseData = JSON.stringify(anyError.response.data || {});
        }
        if (anyError.message) {
          errorDetails.fullErrorMessage = anyError.message;
        }
        if (anyError.code) {
          errorDetails.errorCode = anyError.code;
        }
      }
      log10.error("Gemini transcription failed - Full error details", errorDetails);
      return {
        transcript: "",
        confidence: 0,
        processingTime,
        method: "gemini",
        error: errorMessage
      };
    }
  }
  /**
   * Creates a timeout promise
   */
  createTimeout(ms) {
    return new Promise((resolve) => {
      setTimeout(() => resolve("TIMEOUT"), ms);
    });
  }
  /**
   * Parses error to human-readable message
   */
  parseError(error) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
  /**
   * Classifies error type for analytics
   */
  classifyError(error) {
    const errorStr = String(error).toLowerCase();
    if (errorStr.includes("private") || errorStr.includes("unavailable")) {
      return "PRIVATE_VIDEO" /* PRIVATE_VIDEO */;
    }
    if (errorStr.includes("rate limit") || errorStr.includes("quota")) {
      return "RATE_LIMIT" /* RATE_LIMIT */;
    }
    if (errorStr.includes("timeout")) {
      return "TIMEOUT" /* TIMEOUT */;
    }
    if (errorStr.includes("invalid") || errorStr.includes("url")) {
      return "INVALID_URL" /* INVALID_URL */;
    }
    if (errorStr.includes("too long") || errorStr.includes("duration")) {
      return "VIDEO_TOO_LONG" /* VIDEO_TOO_LONG */;
    }
    if (errorStr.includes("network") || errorStr.includes("connection")) {
      return "NETWORK_ERROR" /* NETWORK_ERROR */;
    }
    return "API_ERROR" /* API_ERROR */;
  }
};

// bookmarks/processors/audio-download.processor.ts
init_domain_types();
var geminiApiKey = secret2("GeminiApiKey");
var podcastDownloader = new PodcastDownloaderService();
var youtubeDownloader = new YouTubeDownloaderService();
var geminiService = new GeminiService(geminiApiKey());
var transcriptionRepo2 = new TranscriptionRepository(db);
async function handleAudioDownload(event) {
  const { bookmarkId, source, url, title } = event;
  let audioBucketKey = null;
  try {
    log11.info("Starting audio download", { bookmarkId, source, url });
    if (source !== "youtube" /* YOUTUBE */ && source !== "podcast" /* PODCAST */) {
      log11.info("Source does not require audio processing, skipping", {
        bookmarkId,
        source
      });
      return;
    }
    const existing = await transcriptionRepo2.findByBookmarkId(bookmarkId);
    if (existing && existing.status !== "pending") {
      log11.warn("Transcription already processed, skipping duplicate event", {
        bookmarkId,
        currentStatus: existing.status
      });
      return;
    }
    if (!existing) {
      await transcriptionRepo2.createPending(bookmarkId);
      log11.info("Created pending transcription record", { bookmarkId });
    }
    await transcriptionRepo2.markAsProcessing(bookmarkId);
    let metadata = {};
    if (source === "youtube" /* YOUTUBE */) {
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL: could not extract video ID");
      }
      log11.info("Attempting Gemini transcription", { bookmarkId, videoId });
      const videoUrl = buildYouTubeUrl(videoId);
      const geminiResult = await geminiService.transcribeYouTubeVideo(videoUrl, videoId);
      if (geminiResult.error) {
        log11.warn("Gemini transcription failed, falling back to Deepgram", {
          bookmarkId,
          videoId,
          geminiError: geminiResult.error
        });
        audioBucketKey = await youtubeDownloader.downloadAndUpload(
          videoId,
          bookmarkId
        );
        log11.info("YouTube audio downloaded for Deepgram fallback", {
          bookmarkId,
          videoId,
          audioBucketKey
        });
        await audioDownloadedTopic.publish({
          bookmarkId,
          audioBucketKey,
          source,
          metadata: { videoId, geminiFailure: geminiResult.error }
        });
        log11.info("Published to Deepgram processing stage", {
          bookmarkId,
          videoId
        });
        return;
      }
      log11.info("Gemini transcription successful", {
        bookmarkId,
        videoId,
        processingTime: geminiResult.processingTime,
        transcriptLength: geminiResult.transcript.length
      });
      await transcriptionRepo2.updateGeminiTranscriptionData(bookmarkId, {
        transcript: geminiResult.transcript,
        confidence: geminiResult.confidence
      });
      await audioTranscribedTopic.publish({
        bookmarkId,
        transcript: geminiResult.transcript,
        source
      });
      log11.info("Published audio-transcribed event", { bookmarkId });
      return;
    } else if (source === "podcast" /* PODCAST */) {
      log11.info("Downloading podcast audio", { bookmarkId, url });
      audioBucketKey = await podcastDownloader.downloadAndUpload(url, bookmarkId);
      metadata = { episodeUrl: url };
    } else {
      throw new Error(`Unsupported audio source: ${source}`);
    }
    log11.info("Audio download completed", {
      bookmarkId,
      source,
      audioBucketKey
    });
    const messageId = await audioDownloadedTopic.publish({
      bookmarkId,
      audioBucketKey,
      source,
      metadata
    });
    log11.info("Published audio-downloaded event", {
      bookmarkId,
      messageId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log11.error(error, "Audio download failed", {
      bookmarkId,
      source,
      errorMessage
    });
    if (audioBucketKey) {
      try {
        await audioFilesBucket.remove(audioBucketKey);
        log11.info("Cleaned up bucket object after failure", {
          bookmarkId,
          audioBucketKey
        });
      } catch (cleanupError) {
        log11.warn(cleanupError, "Failed to clean up bucket object", {
          bookmarkId,
          audioBucketKey
        });
      }
    }
    await transcriptionRepo2.markAsFailed(
      bookmarkId,
      `Audio download failed: ${errorMessage}`
    );
  }
}
var audioDownloadSubscription = new Subscription(
  bookmarkSourceClassifiedTopic,
  "audio-download-processor",
  {
    handler: handleAudioDownload
  }
);

// bookmarks/processors/audio-transcription.processor.ts
import { Subscription as Subscription2 } from "encore.dev/pubsub";
import { secret as secret3 } from "encore.dev/config";
import log13 from "encore.dev/log";

// bookmarks/services/deepgram.service.ts
import { createClient } from "@deepgram/sdk";
import log12 from "encore.dev/log";
var DeepgramService = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  /**
   * Transcribes audio buffer using Deepgram with all Audio Intelligence features
   * @param audioBuffer - Audio file as Buffer
   * @param audioKey - Identifier for logging (e.g., bucket key or video ID)
   * @returns Deepgram response with transcription and audio intelligence data
   * @throws Error if transcription fails
   */
  async transcribe(audioBuffer, audioKey) {
    const deepgram = createClient(this.apiKey);
    log12.info(
      "Transcribing audio with Deepgram Nova-3 and Audio Intelligence",
      { audioKey, bufferSize: audioBuffer.length }
    );
    try {
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        DEEPGRAM_CONFIG
      );
      if (error) {
        throw new Error(`Deepgram API error: ${error.message}`);
      }
      const response = result;
      log12.info("Deepgram transcription completed", {
        duration: response.metadata.duration,
        channels: response.metadata.channels,
        hasSentiment: !!response.results.sentiments,
        hasSummary: !!response.results.summary,
        hasIntents: !!response.results.intents,
        hasTopics: !!response.results.topics
      });
      return response;
    } catch (error) {
      log12.error(error, "Failed to transcribe with Deepgram", { audioKey });
      throw error;
    }
  }
};

// bookmarks/utils/deepgram-extractor.util.ts
function extractDeepgramData(response) {
  const transcript = response.results.channels[0]?.alternatives[0]?.transcript || "";
  if (!transcript) {
    throw new Error("No transcript returned from Deepgram");
  }
  const confidence = response.results.channels[0]?.alternatives[0]?.confidence || 0;
  const duration = response.metadata.duration;
  const sentiment = response.results.sentiments?.average?.sentiment || null;
  const sentimentScore = response.results.sentiments?.average?.sentiment_score || null;
  const deepgramSummary = response.results.summary?.short || null;
  return {
    transcript,
    confidence,
    duration,
    sentiment,
    sentimentScore,
    deepgramSummary
  };
}

// bookmarks/processors/audio-transcription.processor.ts
var deepgramApiKey = secret3("DeepgramAPIKey");
var deepgramService = new DeepgramService(deepgramApiKey());
var transcriptionRepo3 = new TranscriptionRepository(db);
async function handleAudioTranscription(event) {
  const { bookmarkId, audioBucketKey, source, metadata } = event;
  try {
    log13.info("Starting audio transcription", {
      bookmarkId,
      source,
      audioBucketKey,
      metadata
    });
    const audioBuffer = await audioFilesBucket.download(audioBucketKey);
    log13.info("Audio downloaded from bucket", {
      bookmarkId,
      audioBucketKey,
      bufferSize: audioBuffer.length
    });
    const deepgramResponse = await deepgramService.transcribe(
      audioBuffer,
      audioBucketKey
    );
    const {
      transcript,
      confidence,
      duration,
      sentiment,
      sentimentScore,
      deepgramSummary
    } = extractDeepgramData(deepgramResponse);
    log13.info("Transcription completed", {
      bookmarkId,
      transcriptLength: transcript.length,
      confidence,
      duration,
      sentiment,
      sentimentScore,
      hasSummary: !!deepgramSummary,
      hasIntents: !!deepgramResponse.results.intents,
      hasTopics: !!deepgramResponse.results.topics
    });
    await transcriptionRepo3.updateTranscriptionData(bookmarkId, {
      transcript,
      deepgramSummary,
      sentiment,
      sentimentScore,
      deepgramResponse,
      duration,
      confidence
    });
    log13.info("Transcription data stored in database", { bookmarkId });
    await audioFilesBucket.remove(audioBucketKey);
    log13.info("Audio deleted from bucket", { bookmarkId, audioBucketKey });
    const messageId = await audioTranscribedTopic.publish({
      bookmarkId,
      transcript,
      source
    });
    log13.info("Audio transcription completed, published event", {
      bookmarkId,
      source,
      messageId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log13.error(error, "Audio transcription failed", {
      bookmarkId,
      source,
      errorMessage
    });
    await transcriptionRepo3.markAsFailed(
      bookmarkId,
      `Transcription failed: ${errorMessage}`
    );
    try {
      await audioFilesBucket.remove(audioBucketKey);
      log13.info("Audio deleted from bucket after failure", {
        bookmarkId,
        audioBucketKey
      });
    } catch (cleanupError) {
      log13.warn(cleanupError, "Failed to delete audio from bucket", {
        bookmarkId,
        audioBucketKey
      });
    }
  }
}
var audioTranscriptionSubscription = new Subscription2(
  audioDownloadedTopic,
  "audio-transcription-processor",
  {
    handler: handleAudioTranscription
  }
);

// bookmarks/processors/bookmark-classification.processor.ts
import { Subscription as Subscription3 } from "encore.dev/pubsub";
import log14 from "encore.dev/log";

// bookmarks/utils/bookmark-classifier.util.ts
init_domain_types();
function classifyBookmarkUrl(url) {
  const youtubeVideoId = extractYouTubeVideoId(url);
  if (youtubeVideoId) {
    return "youtube" /* YOUTUBE */;
  }
  const podcastInfo = parsePodcastUrl(url);
  if (podcastInfo.platform !== "unknown") {
    return "podcast" /* PODCAST */;
  }
  if (url.includes("reddit.com/r/") || url.includes("redd.it/")) {
    return "reddit" /* REDDIT */;
  }
  if (url.includes("twitter.com/") || url.includes("x.com/")) {
    return "twitter" /* TWITTER */;
  }
  if (url.includes("linkedin.com/")) {
    return "linkedin" /* LINKEDIN */;
  }
  if (url.includes("medium.com/") || url.includes("substack.com/") || url.includes("wordpress.com/") || url.includes("blogspot.com/") || url.includes("ghost.io/") || url.includes("/blog/") || url.includes("/article/")) {
    return "blog" /* BLOG */;
  }
  return "web" /* WEB */;
}

// bookmarks/processors/bookmark-classification.processor.ts
init_domain_types();
var bookmarkRepo3 = new BookmarkRepository(db);
async function handleBookmarkClassification(event) {
  const { bookmarkId, url, source, title } = event;
  log14.info("Received bookmark for classification", {
    bookmarkId,
    url,
    currentSource: source
  });
  let finalSource = source;
  if (source === "web" /* WEB */) {
    const detectedSource = classifyBookmarkUrl(url);
    log14.info("URL classification completed", {
      bookmarkId,
      url,
      detectedSource
    });
    if (detectedSource !== "web" /* WEB */) {
      try {
        await bookmarkRepo3.updateSource(bookmarkId, detectedSource);
        log14.info("Updated bookmark source", {
          bookmarkId,
          oldSource: source,
          newSource: detectedSource
        });
        finalSource = detectedSource;
      } catch (error) {
        log14.error(error, "Failed to update bookmark source", {
          bookmarkId,
          detectedSource
        });
      }
    }
  } else {
    log14.info("Skipping classification, source already known", {
      bookmarkId,
      source
    });
  }
  try {
    const messageId = await bookmarkSourceClassifiedTopic.publish({
      bookmarkId,
      source: finalSource,
      url,
      title
    });
    log14.info("Published bookmark-source-classified event", {
      bookmarkId,
      source: finalSource,
      messageId
    });
  } catch (error) {
    log14.error(error, "Failed to publish bookmark-source-classified event", {
      bookmarkId,
      source: finalSource
    });
    throw error;
  }
}
var bookmarkClassificationSubscription = new Subscription3(
  bookmarkCreatedTopic,
  "bookmark-classification-processor",
  {
    handler: handleBookmarkClassification
  }
);

// bookmarks/processors/content-extraction.processor.ts
import { Subscription as Subscription4 } from "encore.dev/pubsub";
import log16 from "encore.dev/log";
import { secret as secret4 } from "encore.dev/config";

// bookmarks/events/content-extracted.events.ts
import { Topic as Topic5 } from "encore.dev/pubsub";
var contentExtractedTopic = new Topic5(
  "content-extracted",
  {
    deliveryGuarantee: "at-least-once"
  }
);

// bookmarks/services/firecrawl.service.ts
import log15 from "encore.dev/log";

// bookmarks/config/firecrawl.config.ts
var FIRECRAWL_CONFIG = {
  // API endpoint
  baseUrl: "https://api.firecrawl.dev/v1",
  // Request timeout (30 seconds)
  timeout: 3e4,
  // Output formats to request
  formats: ["markdown", "html"],
  // Extract main content only (skip nav, footer, ads)
  onlyMainContent: true,
  // Include page metadata
  includeMetadata: true,
  // Retry configuration
  retries: {
    maxAttempts: 3,
    baseDelayMs: 1e3,
    // Start at 1 second
    maxDelayMs: 1e4,
    // Cap at 10 seconds
    exponentialBackoff: true
  }
};
var CONTENT_TYPE_THRESHOLDS = {
  SHORT_POST: 500,
  // < 500 words = short post (tweets, reddit comments)
  ARTICLE: 2e3,
  // 500-2000 words = article (blog posts)
  LONG_FORM: Infinity
  // > 2000 words = long-form (essays, documentation)
};
var READING_SPEED_WPM = 200;
function getContentType(wordCount) {
  if (wordCount < CONTENT_TYPE_THRESHOLDS.SHORT_POST) {
    return "short_post";
  }
  if (wordCount < CONTENT_TYPE_THRESHOLDS.ARTICLE) {
    return "article";
  }
  return "long_form";
}
function calculateReadingTime(wordCount) {
  return Math.ceil(wordCount / READING_SPEED_WPM);
}

// bookmarks/services/firecrawl.service.ts
var FirecrawlService = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  /**
   * Scrapes a URL and returns clean markdown content with metadata
   *
   * @param url - The URL to scrape
   * @returns FireCrawl response with markdown, HTML, and metadata
   * @throws Error if scraping fails after all retries
   */
  async scrape(url) {
    const startTime = Date.now();
    log15.info("Starting FireCrawl scrape", { url });
    try {
      const response = await this.fetchWithRetry(url);
      const durationMs = Date.now() - startTime;
      log15.info("FireCrawl scrape successful", {
        url,
        durationMs,
        contentLength: response.data.markdown?.length || 0,
        hasMetadata: !!response.data.metadata
      });
      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      log15.error(error, "FireCrawl scrape failed", {
        url,
        durationMs,
        errorMessage
      });
      throw new Error(`Failed to scrape URL ${url}: ${errorMessage}`);
    }
  }
  /**
   * Internal method with retry logic and exponential backoff
   */
  async fetchWithRetry(url, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        FIRECRAWL_CONFIG.timeout
      );
      const response = await fetch(`${FIRECRAWL_CONFIG.baseUrl}/scrape`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          formats: FIRECRAWL_CONFIG.formats,
          onlyMainContent: FIRECRAWL_CONFIG.onlyMainContent
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          throw new Error(
            `Rate limited. Retry after: ${retryAfter || "unknown"}`
          );
        }
        throw new Error(
          `FireCrawl API error (${response.status}): ${errorText}`
        );
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error("FireCrawl returned unsuccessful response");
      }
      return data;
    } catch (error) {
      if (attempt < FIRECRAWL_CONFIG.retries.maxAttempts) {
        const delay = this.calculateBackoffDelay(attempt);
        log15.warn("Retrying FireCrawl request", {
          url,
          attempt,
          nextAttempt: attempt + 1,
          delayMs: delay,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  }
  /**
   * Calculates exponential backoff delay with jitter
   */
  calculateBackoffDelay(attempt) {
    const { baseDelayMs, maxDelayMs } = FIRECRAWL_CONFIG.retries;
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = exponentialDelay * Math.random() * 0.25;
    return Math.min(exponentialDelay + jitter, maxDelayMs);
  }
};

// bookmarks/repositories/web-content.repository.ts
var WebContentRepository = class {
  constructor(db3) {
    this.db = db3;
  }
  /**
   * Creates a pending web content record for a bookmark
   * Uses ON CONFLICT DO NOTHING for idempotency
   */
  async createPending(bookmarkId) {
    const row = await this.db.queryRow`
      INSERT INTO web_contents (bookmark_id, status)
      VALUES (${bookmarkId}, 'pending')
      ON CONFLICT (bookmark_id) DO NOTHING
      RETURNING *
    `;
    if (!row) {
      const existing = await this.findByBookmarkId(bookmarkId);
      if (existing) {
        return existing;
      }
      throw new Error(`Failed to create pending web content for bookmark ${bookmarkId}`);
    }
    return row;
  }
  /**
   * Marks web content as processing
   */
  async markAsProcessing(bookmarkId) {
    await this.db.exec`
      UPDATE web_contents
      SET
        status = 'processing',
        processing_started_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
  /**
   * Updates web content with extracted data from FireCrawl
   */
  async updateContent(bookmarkId, data) {
    await this.db.exec`
      UPDATE web_contents
      SET
        raw_markdown = ${data.raw_markdown},
        raw_html = ${data.raw_html},
        page_title = ${data.page_title},
        page_description = ${data.page_description},
        language = ${data.language},
        word_count = ${data.word_count},
        char_count = ${data.char_count},
        estimated_reading_minutes = ${data.estimated_reading_minutes},
        metadata = ${data.metadata}
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
  /**
   * Updates the summary field (from OpenAI)
   */
  async updateSummary(bookmarkId, summary) {
    await this.db.exec`
      UPDATE web_contents
      SET summary = ${summary}
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
  /**
   * Marks web content as completed
   */
  async markAsCompleted(bookmarkId) {
    await this.db.exec`
      UPDATE web_contents
      SET
        status = 'completed',
        processing_completed_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
  /**
   * Marks web content as failed with error message
   */
  async markAsFailed(bookmarkId, errorMessage) {
    await this.db.exec`
      UPDATE web_contents
      SET
        status = 'failed',
        error_message = ${errorMessage},
        processing_completed_at = NOW()
      WHERE bookmark_id = ${bookmarkId}
    `;
  }
  /**
   * Finds web content by bookmark ID
   */
  async findByBookmarkId(bookmarkId) {
    return await this.db.queryRow`
      SELECT * FROM web_contents
      WHERE bookmark_id = ${bookmarkId}
    ` || null;
  }
  /**
   * Finds web content by ID
   */
  async findById(id) {
    return await this.db.queryRow`
      SELECT * FROM web_contents
      WHERE id = ${id}
    ` || null;
  }
  /**
   * Lists all web content with pagination
   */
  async list(params) {
    const { limit, offset, status } = params;
    const query = status ? this.db.query`
          SELECT * FROM web_contents
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        ` : this.db.query`
          SELECT * FROM web_contents
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
    const items = [];
    for await (const item of query) {
      items.push(item);
    }
    return items;
  }
};

// bookmarks/processors/content-extraction.processor.ts
var firecrawlApiKey = secret4("FirecrawlAPIKey");
var firecrawlService = new FirecrawlService(firecrawlApiKey());
var webContentRepo = new WebContentRepository(db);
var TEXTUAL_SOURCES = [
  "blog" /* BLOG */,
  "web" /* WEB */,
  "reddit" /* REDDIT */,
  "twitter" /* TWITTER */,
  "linkedin" /* LINKEDIN */
];
async function handleContentExtraction(event) {
  const { bookmarkId, source, url, title } = event;
  if (!TEXTUAL_SOURCES.includes(source)) {
    log16.info("Skipping content extraction for non-textual source", {
      bookmarkId,
      source
    });
    return;
  }
  try {
    log16.info("Starting content extraction", {
      bookmarkId,
      url,
      source
    });
    const existing = await webContentRepo.findByBookmarkId(bookmarkId);
    if (existing && existing.status !== "pending" /* PENDING */) {
      log16.warn("Content already processed or in progress, skipping", {
        bookmarkId,
        currentStatus: existing.status
      });
      return;
    }
    if (!existing) {
      await webContentRepo.createPending(bookmarkId);
      log16.info("Created pending web content record", { bookmarkId });
    }
    await webContentRepo.markAsProcessing(bookmarkId);
    const scraped = await firecrawlService.scrape(url);
    if (!scraped.success || !scraped.data.markdown) {
      throw new Error("FireCrawl returned unsuccessful response or missing markdown");
    }
    const markdown = scraped.data.markdown;
    const wordCount = markdown.split(/\s+/).filter((w) => w.length > 0).length;
    const charCount = markdown.length;
    const estimatedReadingMinutes = calculateReadingTime(wordCount);
    const metadata = scraped.data.metadata || {};
    log16.info("Content extraction metrics calculated", {
      bookmarkId,
      wordCount,
      charCount,
      estimatedReadingMinutes,
      hasMetadata: !!scraped.data.metadata
    });
    await webContentRepo.updateContent(bookmarkId, {
      raw_markdown: markdown,
      raw_html: scraped.data.html || "",
      // Safe metadata access with fallback chain: metadata → event title → "Untitled"
      page_title: metadata.title || title || "Untitled",
      page_description: metadata.description || "",
      language: metadata.language || "en",
      word_count: wordCount,
      char_count: charCount,
      estimated_reading_minutes: estimatedReadingMinutes,
      // Store full metadata object (could be empty {})
      metadata
    });
    log16.info("Content extraction completed successfully", {
      bookmarkId,
      wordCount,
      pageTitle: metadata.title || title || "Untitled"
    });
    const messageId = await contentExtractedTopic.publish({
      bookmarkId,
      content: markdown,
      wordCount,
      source
    });
    log16.info("Published content-extracted event", {
      bookmarkId,
      messageId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log16.error(error, "Content extraction failed", {
      bookmarkId,
      url,
      source,
      errorMessage
    });
    await webContentRepo.markAsFailed(
      bookmarkId,
      `Extraction failed: ${errorMessage}`
    );
  }
}
var contentExtractionSubscription = new Subscription4(
  bookmarkSourceClassifiedTopic,
  "content-extraction-processor",
  {
    handler: handleContentExtraction
  }
);

// bookmarks/processors/content-summary.processor.ts
import { Subscription as Subscription5 } from "encore.dev/pubsub";
import log18 from "encore.dev/log";

// bookmarks/services/openai.service.ts
import OpenAI from "openai";
import log17 from "encore.dev/log";
init_daily_digest_config();
init_domain_types();
init_prompts_config();
var OpenAIService = class {
  client;
  constructor(apiKey) {
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
  async generateSummary(content, sourceOrInstructions, options) {
    const isLegacyMode = typeof sourceOrInstructions === "string" || sourceOrInstructions === void 0;
    const instructions = isLegacyMode ? typeof sourceOrInstructions === "string" ? sourceOrInstructions : OPENAI_CONFIG.instructions : this.getInstructionsForSource(
      sourceOrInstructions,
      options?.contentType || "article"
    );
    const maxTokens = options?.maxTokens || OPENAI_CONFIG.maxOutputTokens;
    log17.info("Generating summary with OpenAI Responses API", {
      contentLength: content.length,
      isLegacyMode,
      source: isLegacyMode ? "custom" : sourceOrInstructions,
      contentType: options?.contentType,
      maxTokens
    });
    try {
      const response = await this.client.responses.create({
        model: OPENAI_CONFIG.model,
        instructions,
        input: `Please provide a concise summary:

${content}`,
        temperature: OPENAI_CONFIG.temperature,
        max_output_tokens: maxTokens
      });
      const summary = response.output_text || "No summary available";
      log17.info("Summary generated successfully", {
        contentLength: content.length,
        summaryLength: summary.length,
        source: isLegacyMode ? "custom" : sourceOrInstructions,
        contentType: options?.contentType
      });
      return summary;
    } catch (error) {
      log17.error(error, "Failed to generate summary with OpenAI", {
        contentLength: content.length,
        source: isLegacyMode ? "custom" : sourceOrInstructions,
        errorMessage: error instanceof Error ? error.message : String(error)
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
  getInstructionsForSource(source, contentType) {
    let instructions = SUMMARY_PROMPTS[source] || SUMMARY_PROMPTS["other" /* OTHER */];
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
   * Generates a daily digest from prompt and content
   * Used for Tier 1 (simple concatenation) and Tier 2 (reduce phase)
   * @param prompt - The formatted prompt with instructions
   * @param content - The content to process (summaries or intermediate text)
   * @param maxTokens - Custom max output tokens (optional, defaults to config)
   * @returns Digest text
   * @throws Error if generation fails
   */
  async generateDigest(prompt, content, maxTokens) {
    const tokensToUse = maxTokens ?? DAILY_DIGEST_CONFIG.maxOutputTokens;
    log17.info("Generating daily digest with OpenAI Responses API", {
      promptLength: prompt.length,
      contentLength: content.length,
      maxTokens: tokensToUse
    });
    try {
      const response = await this.client.responses.create({
        model: DAILY_DIGEST_CONFIG.openaiModel,
        instructions: prompt,
        input: content,
        temperature: DAILY_DIGEST_CONFIG.temperature,
        max_output_tokens: tokensToUse
      });
      const digest = response.output_text || "No digest generated";
      log17.info("Daily digest generated successfully", {
        digestLength: digest.length
      });
      return digest;
    } catch (error) {
      log17.error(error, "Failed to generate daily digest with OpenAI");
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
};

// bookmarks/processors/content-summary.processor.ts
import { secret as secret5 } from "encore.dev/config";
var openaiApiKey = secret5("OpenAIAPIKey");
var openaiService = new OpenAIService(openaiApiKey());
var webContentRepo2 = new WebContentRepository(db);
async function handleContentSummary(event) {
  const { bookmarkId, content, wordCount, source } = event;
  try {
    log18.info("Starting content summarization", {
      bookmarkId,
      wordCount,
      source
    });
    const contentType = getContentType(wordCount);
    log18.info("Content type classified", {
      bookmarkId,
      contentType,
      wordCount
    });
    const maxTokens = (() => {
      switch (contentType) {
        case "short_post":
          return 150;
        case "article":
          return 300;
        case "long_form":
          return 500;
      }
    })();
    const summary = await openaiService.generateSummary(
      content,
      source,
      { maxTokens, contentType }
    );
    log18.info("Summary generated successfully", {
      bookmarkId,
      summaryLength: summary.length,
      contentType
    });
    await webContentRepo2.updateSummary(bookmarkId, summary);
    await webContentRepo2.markAsCompleted(bookmarkId);
    log18.info("Content summarization completed", {
      bookmarkId,
      summaryLength: summary.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log18.error(error, "Content summarization failed", {
      bookmarkId,
      wordCount,
      source,
      errorMessage
    });
    await webContentRepo2.markAsFailed(
      bookmarkId,
      `Summarization failed: ${errorMessage}`
    );
  }
}
var contentSummarySubscription = new Subscription5(
  contentExtractedTopic,
  "content-summary-processor",
  {
    handler: handleContentSummary
  }
);

// bookmarks/processors/summary-generation.processor.ts
import { Subscription as Subscription6 } from "encore.dev/pubsub";
import { secret as secret6 } from "encore.dev/config";
import log19 from "encore.dev/log";
init_prompts_config();
var openaiApiKey2 = secret6("OpenAIAPIKey");
var openaiService2 = new OpenAIService(openaiApiKey2());
var transcriptionRepo4 = new TranscriptionRepository(db);
async function handleSummaryGeneration(event) {
  const { bookmarkId, transcript, source } = event;
  try {
    const prompt = SUMMARY_PROMPTS[source] || DEFAULT_SUMMARY_PROMPT;
    log19.info("Starting summary generation", {
      bookmarkId,
      source,
      transcriptLength: transcript.length,
      usingPrompt: source
    });
    const summary = await openaiService2.generateSummary(transcript, prompt);
    log19.info("Summary generated", {
      bookmarkId,
      source,
      summaryLength: summary.length
    });
    await transcriptionRepo4.updateSummary(bookmarkId, summary);
    log19.info("Summary generation completed, transcription marked as completed", {
      bookmarkId,
      source
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log19.error(error, "Summary generation failed", {
      bookmarkId,
      source,
      errorMessage
    });
    await transcriptionRepo4.markAsFailed(
      bookmarkId,
      `Summary generation failed: ${errorMessage}`
    );
  }
}
var summaryGenerationSubscription = new Subscription6(
  audioTranscribedTopic,
  "summary-generation-processor",
  {
    handler: handleSummaryGeneration
  }
);

// bookmarks/encore.service.ts
import { Service } from "encore.dev/service";

// bookmarks/cron/daily-digest.cron.ts
import { CronJob } from "encore.dev/cron";
var _ = new CronJob("daily-digest-generator", {
  title: "Generate Daily Digest",
  schedule: "0 21 * * *",
  // 9 PM GMT every day
  endpoint: generateYesterdaysDigest2
});

// bookmarks/encore.service.ts
var encore_service_default = new Service("bookmarks");

// users/encore.service.ts
import { Service as Service2 } from "encore.dev/service";
var encore_service_default2 = new Service2("users");

// encore.gen/internal/entrypoints/combined/main.ts
var gateways = [
  gateway
];
var handlers = [
  {
    apiRoute: {
      service: "bookmarks",
      name: "createTest",
      handler: createTest,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": false, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "generateDigestTest",
      handler: generateDigestTest,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": false, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "create",
      handler: create2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "get",
      handler: get2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "list",
      handler: list2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "update",
      handler: update2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "remove",
      handler: remove2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "getDetails",
      handler: getDetails2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "generateDailyDigest",
      handler: generateDailyDigest2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "getDailyDigest",
      handler: getDailyDigest2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "listDailyDigests",
      handler: listDailyDigests2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "bookmarks",
      name: "generateYesterdaysDigest",
      handler: generateYesterdaysDigest2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": false, "auth": false, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "users",
      name: "me",
      handler: me2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default2.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "users",
      name: "updateProfile",
      handler: updateProfile2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": true, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default2.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "users",
      name: "getUserIds",
      handler: getUserIds2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": false, "auth": false, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default2.cfg.middlewares || []
  },
  {
    apiRoute: {
      service: "users",
      name: "userCreated",
      handler: userCreated2,
      raw: false,
      streamingRequest: false,
      streamingResponse: false
    },
    endpointOptions: { "expose": true, "auth": false, "isRaw": false, "isStream": false, "tags": [] },
    middlewares: encore_service_default2.cfg.middlewares || []
  }
];
registerGateways(gateways);
registerHandlers(handlers);
await run(import.meta.url);
//# sourceMappingURL=main.mjs.map
