import log from "encore.dev/log";
import { ChatOpenAI } from "@langchain/openai";
import { DigestContentItem } from "../types/web-content.types";
import { DAILY_DIGEST_CONFIG } from "../config/daily-digest.config";
import {
  MAP_REDUCE_MAP_PROMPT,
  MAP_REDUCE_REDUCE_PROMPT,
  CLUSTER_SUMMARY_PROMPT,
  formatSourceName,
} from "../config/prompts.config";
import { batchSummaries, estimateTokenCount } from "../utils/token-estimator.util";

export interface DigestNarrativeContext {
  digestDate?: string;
  totalItems?: number;
  audioCount?: number;
  articleCount?: number;
}

interface MapBeat {
  itemNumber: number;
  groupKey: string;
  rawGroupKey: string;
  segmentTitle: string;
  headline: string;
  urgencyScore: number;
  urgencyLabel: string;
  whyItMatters: string;
  fastFacts: string[];
  soundbite: string;
  formatCue: string;
  actionStep: string;
  forwardSignal: string;
  tags: string[];
  sourceNotes: string;
}

interface ThemeCluster {
  slug: string;
  beats: MapBeat[];
  tags: Set<string>;
  maxUrgency: number;
  formatCues: Set<string>;
}

interface ClusterSummary {
  slug: string;
  segmentName: string;
  anchorIntro: string;
  essentialPoints: string[];
  highlightSoundbite: string;
  recommendedAction: string;
  segue: string;
  tags: string[];
  maxUrgency: number;
  urgencyLabel: string;
  formatCues: string[];
}

function slugify(value: string, fallback: string): string {
  const base = value?.trim().toLowerCase() || fallback.trim().toLowerCase();
  const slug = base
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "general";
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  return Array.from(
    new Set(
      tags
        .flatMap((tag) =>
          tag
            .split(/[,\s]+/)
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        )
    )
  );
}

function clampUrgencyScore(value: unknown): number {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.min(5, Math.max(1, Math.round(numeric)));
  }
  return 3;
}

function normalizeUrgencyLabel(label: unknown, score: number): string {
  const fallback = deriveUrgencyLabel(score);
  if (!label) return fallback;
  const normalized = label.toString().trim().toLowerCase();
  const mapping: Record<string, string> = {
    immediate: "Immediate",
    high: "High",
    watch: "Watch",
    background: "Background",
  };
  return mapping[normalized] ?? fallback;
}

function deriveUrgencyLabel(score: number): string {
  if (score >= 5) return "Immediate";
  if (score === 4) return "High";
  if (score === 3) return "Watch";
  return "Background";
}

function highestUrgency(beats: MapBeat[]): {
  score: number;
  label: string;
} {
  if (!beats.length) {
    return { score: 0, label: "Background" };
  }
  const sorted = [...beats].sort((a, b) => b.urgencyScore - a.urgencyScore);
  return {
    score: sorted[0]?.urgencyScore ?? 0,
    label: sorted[0]?.urgencyLabel ?? deriveUrgencyLabel(sorted[0]?.urgencyScore ?? 0),
  };
}

function termOverlap(a: string, b: string): number {
  const tokenize = (value: string) =>
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3);

  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });
  return intersection / Math.min(setA.size, setB.size);
}

function extractJsonPayload(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try fenced code block
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      return extractJsonPayload(match[1]);
    }
    // Try to locate array/object via first bracket
    const firstBracket = trimmed.indexOf("[");
    const firstBrace = trimmed.indexOf("{");
    const start = firstBracket !== -1 ? firstBracket : firstBrace;
    if (start !== -1) {
      const snippet = trimmed.slice(start);
      try {
        return JSON.parse(snippet);
      } catch {
        // fall through
      }
    }
    throw new Error("Unable to parse JSON payload from LLM response");
  }
}

/**
 * Format DigestContentItems with metadata for LLM prompts
 * Handles both audio and article content types
 */
function formatContentItemsWithMetadata(
  items: DigestContentItem[],
  startIndex: number
): string {
  return items.map((item, idx) => {
    const sourceName = formatSourceName(item.source);
    const contentType = item.content_type === 'audio' ? '🎧 Audio' : '📄 Article';

    const title = item.title || sourceName;
    const createdAt = item.created_at
      ? new Date(item.created_at).toISOString()
      : "unknown";
    const itemNumber = startIndex + idx + 1;

    const durationStr =
      item.content_type === "audio" && item.duration
        ? `${Math.max(1, Math.round(item.duration / 60))} min runtime`
        : null;

    const readingStr =
      item.content_type === "article" && item.reading_minutes
        ? `${item.reading_minutes} min read`
        : null;

    const sentimentStr = item.sentiment
      ? `tone: ${item.sentiment}`
      : null;

    const metaParts = [
      durationStr,
      readingStr,
      sentimentStr,
    ].filter(Boolean);

    const metadataLine = metaParts.length
      ? `Meta: ${metaParts.join(" · ")}`
      : null;

    return `[ITEM ${itemNumber}]
Type: ${contentType}
Title: ${title}
Source: ${sourceName}
Captured: ${createdAt}
${metadataLine ? metadataLine + "\n" : ""}Summary:
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

  private clusterBeats(beats: MapBeat[]): ThemeCluster[] {
    const clusters: ThemeCluster[] = [];
    const slugMap = new Map<string, ThemeCluster>();

    for (const beat of beats) {
      const normalizedSlug =
        beat.groupKey || slugify(beat.segmentTitle || beat.headline, "general");
      let cluster = slugMap.get(normalizedSlug);

      if (!cluster) {
        cluster = this.findClusterForBeat(normalizedSlug, beat, clusters);
        if (!cluster) {
          cluster = {
            slug: normalizedSlug,
            beats: [],
            tags: new Set<string>(),
            maxUrgency: 0,
            formatCues: new Set<string>(),
          };
          clusters.push(cluster);
        }
        slugMap.set(normalizedSlug, cluster);
      }

      cluster.beats.push(beat);
      beat.tags.forEach((tag) => cluster!.tags.add(tag));
      cluster.maxUrgency = Math.max(cluster.maxUrgency, beat.urgencyScore);
      if (beat.formatCue) {
        cluster.formatCues.add(beat.formatCue);
      }
    }

    return clusters;
  }

  private findClusterForBeat(
    slug: string,
    beat: MapBeat,
    clusters: ThemeCluster[]
  ): ThemeCluster | undefined {
    const beatTags = new Set(beat.tags);

    // Prefer clusters with same slug already present
    const directMatch = clusters.find((cluster) => cluster.slug === slug);
    if (directMatch) {
      return directMatch;
    }

    let bestMatch: { cluster: ThemeCluster; score: number } | undefined;

    for (const cluster of clusters) {
      const clusterTags = cluster.tags;
      let overlap = 0;
      beatTags.forEach((tag) => {
        if (clusterTags.has(tag)) overlap += 1;
      });

      const tagScore =
        beatTags.size && clusterTags.size
          ? overlap / Math.min(beatTags.size, clusterTags.size)
          : 0;

      const titleScore = Math.max(
        termOverlap(beat.segmentTitle, cluster.beats[0]?.segmentTitle || ""),
        termOverlap(beat.headline, cluster.beats[0]?.headline || "")
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

  private async summarizeClusters(
    clusters: ThemeCluster[]
  ): Promise<ClusterSummary[]> {
    const summaries: ClusterSummary[] = [];

    for (const cluster of clusters) {
      const candidateTitles = Array.from(
        new Set(
          cluster.beats
            .flatMap((beat) => [beat.segmentTitle, beat.headline])
            .filter(Boolean)
            .map((title) => title!.toString())
        )
      );

      const clusterItems = cluster.beats
        .map((beat) => {
          const facts = beat.fastFacts.map((fact) => `• ${fact}`).join("\n");
          const tags = beat.tags.join(", ") || "none";
          return `Item ${beat.itemNumber} [${beat.urgencyLabel} · ${beat.urgencyScore}/5]
Segment: ${beat.segmentTitle}
Headline: ${beat.headline}
Why it matters: ${beat.whyItMatters}
Fast facts:
${facts ? facts : "• (fact missing)"}
Soundbite: ${beat.soundbite || "n/a"}
Action cue: ${beat.actionStep}
Forward signal: ${beat.forwardSignal}
Format: ${beat.formatCue || "unspecified"}
Tags: ${tags}
Source: ${beat.sourceNotes}`;
        })
        .join("\n\n");

      const { score: urgencyScore, label: urgencyLabel } = highestUrgency(
        cluster.beats
      );
      const formatCues = Array.from(cluster.formatCues).filter(Boolean);

      const prompt = CLUSTER_SUMMARY_PROMPT.replace(
        "{cluster_slug}",
        cluster.slug
      )
        .replace("{candidate_titles}", candidateTitles.join(" | ") || cluster.slug)
        .replace(
          "{cluster_tags}",
          Array.from(cluster.tags).join(", ") || "general"
        )
        .replace("{cluster_urgency}", `${urgencyLabel} (${urgencyScore}/5)`)
        .replace(
          "{cluster_formats}",
          formatCues.length ? formatCues.join(" | ") : "mixed formats"
        )
        .replace("{cluster_items}", clusterItems);

      const response = await this.llm.invoke(prompt);
      const payload = extractJsonPayload(response.content.toString());

      if (!payload?.segment_name || !payload?.anchor_intro) {
        throw new Error(
          `Cluster summary missing fields for slug ${cluster.slug}`
        );
      }

      const essentialPoints = Array.isArray(payload.essential_points)
        ? payload.essential_points
            .map((t: any) => t?.toString?.().trim())
            .filter((t: string | undefined): t is string => Boolean(t))
        : [];

      summaries.push({
        slug: cluster.slug,
        segmentName: payload.segment_name.toString(),
        anchorIntro: payload.anchor_intro.toString(),
        essentialPoints,
        highlightSoundbite: (payload.highlight_soundbite || "").toString(),
        recommendedAction: (payload.recommended_action || "").toString(),
        segue: (payload.segue || "").toString(),
        tags: Array.from(cluster.tags),
        maxUrgency: urgencyScore,
        urgencyLabel,
        formatCues,
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
  async generateDigest(
    contentItems: DigestContentItem[],
    context?: DigestNarrativeContext
  ): Promise<string> {
    const audioCount = contentItems.filter(c => c.content_type === 'audio').length;
    const articleCount = contentItems.filter(c => c.content_type === 'article').length;
    const totalItems = contentItems.length;

    log.info("Starting map-reduce digest generation", {
      contentItemCount: totalItems,
      audioCount,
      articleCount,
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

      // Step 3: Map phase - Process each batch into structured beats
      const mapBeats = await this.mapPhase(batches, contentItems);

      log.info("Map phase completed", {
        beatCount: mapBeats.length,
      });

      // Step 4: Cluster beats into coherent themes
      const clusters = this.clusterBeats(mapBeats);

      log.info("Clustering completed", {
        clusterCount: clusters.length,
        clusterSlugs: clusters.map((c) => c.slug),
      });

      // Step 5: Summarise clusters into narrative-ready briefs
      const clusterSummaries = await this.summarizeClusters(clusters);

      log.info("Cluster summarisation completed", {
        clusterSummaryCount: clusterSummaries.length,
      });

      // Step 6: Reduce phase - Combine cluster summaries into final digest
      const finalDigest = await this.reducePhase(clusterSummaries, {
        digestDate: context?.digestDate,
        totalItems: context?.totalItems ?? totalItems,
        audioCount: context?.audioCount ?? audioCount,
        articleCount: context?.articleCount ?? articleCount,
      });

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
  ): Promise<MapBeat[]> {
    log.info("Starting map phase", { batchCount: batches.length });

    const beats: MapBeat[] = [];
    let currentIndex = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchContentItems = contentItems.slice(
        currentIndex,
        currentIndex + batch.length
      );

      log.info("Processing batch", {
        batchIndex,
        batchSize: batch.length,
        startIndex: currentIndex,
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
        log.warn("Map response length mismatch, will align best effort", {
          expected: batch.length,
          received: payload.length,
        });
      }

      payload.forEach((rawBeat: any, idx: number) => {
        const itemNumber =
          typeof rawBeat?.item_number === "number"
            ? rawBeat.item_number
            : currentIndex + idx + 1;

        const sourceItem = batchContentItems[idx];
        const cleanKey = slugify(
          rawBeat?.group_key || "",
          rawBeat?.segment_title || rawBeat?.headline || ""
        );

        const tags = normalizeTags(rawBeat?.tags);
        const urgencyScore = clampUrgencyScore(rawBeat?.urgency_score);
        const urgencyLabel = normalizeUrgencyLabel(
          rawBeat?.urgency_label,
          urgencyScore
        );
        const fastFacts = Array.isArray(rawBeat?.fast_facts)
          ? rawBeat.fast_facts
              .map((fact: any) => fact?.toString?.().trim())
              .filter((fact: string | undefined): fact is string => Boolean(fact))
          : [];
        const inferredFormatCue =
          sourceItem?.content_type === "audio"
            ? "🎧 Audio highlight"
            : "📄 Quick read";
        const formatCue = (rawBeat?.format_cue || "").toString() || inferredFormatCue;
        const rawSoundbite = (rawBeat?.soundbite || "").toString();
        const soundbite =
          rawSoundbite.trim().toLowerCase() === "n/a" ? "" : rawSoundbite;

        beats.push({
          itemNumber,
          groupKey: cleanKey,
          rawGroupKey: (rawBeat?.group_key || "").toString(),
          segmentTitle: (rawBeat?.segment_title || "").toString(),
          headline: (rawBeat?.headline || "").toString(),
          urgencyScore,
          urgencyLabel,
          whyItMatters: (rawBeat?.why_it_matters || "").toString(),
          fastFacts,
          soundbite: soundbite,
          formatCue,
          actionStep: (rawBeat?.action_step || "").toString(),
          forwardSignal: (rawBeat?.forward_signal || "").toString(),
          tags,
          sourceNotes: (rawBeat?.source_notes || "").toString(),
        });
      });

      currentIndex += batch.length;
    }

    return beats;
  }

  private async reducePhase(
    clusterSummaries: ClusterSummary[],
    context: DigestNarrativeContext
  ): Promise<string> {
    log.info("Starting reduce phase", {
      clusterCount: clusterSummaries.length,
    });

    if (clusterSummaries.length === 0) {
      throw new Error("No cluster summaries available for reduction");
    }

    const orderedSummaries = [...clusterSummaries].sort(
      (a, b) => b.maxUrgency - a.maxUrgency
    );

    const clusterBriefs = orderedSummaries
      .map((cluster, idx) => {
        const points = cluster.essentialPoints
          .map((point) => `- ${point}`)
          .join("\n");
        const formats = cluster.formatCues.join(", ") || "mixed formats";
        return `Cluster ${idx + 1} (${cluster.slug})
Segment: ${cluster.segmentName}
Urgency: ${cluster.urgencyLabel} (${cluster.maxUrgency}/5)
Formats: ${formats}
Anchor intro: ${cluster.anchorIntro}
Essential points:
${points || "-"}
Soundbite: ${cluster.highlightSoundbite}
Action: ${cluster.recommendedAction}
Segue: ${cluster.segue}
Tags: ${cluster.tags.join(", ") || "general"}`;
      })
      .join("\n\n");

    const spotlightCluster = orderedSummaries[0];

    const reducePrompt = MAP_REDUCE_REDUCE_PROMPT
      .replace("{cluster_briefs}", clusterBriefs)
      .replace("{digest_date}", context.digestDate || "Today")
      .replace(
        "{total_items}",
        String(context.totalItems ?? clusterSummaries.length)
      )
      .replace("{audio_count}", String(context.audioCount ?? 0))
      .replace("{article_count}", String(context.articleCount ?? 0))
      .replace("{spotlight_slug}", spotlightCluster?.slug ?? "general");

    const result = await this.llm.invoke(reducePrompt);
    return result.content.toString();
  }
}
