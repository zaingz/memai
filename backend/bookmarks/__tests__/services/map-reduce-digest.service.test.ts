/**
 * MapReduceDigestService Tests (narrative clustering pipeline)
 *
 * Focus: verify structured map output -> clustering -> reduce orchestration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookmarkSource } from "../../types/domain.types";
import type { DigestContentItem } from "../../types/web-content.types";

// Hoist mocks
const {
  mockLLMInvoke,
  mockBatchSummaries,
  mockEstimateTokenCount,
  mockLog,
} = vi.hoisted(() => ({
  mockLLMInvoke: vi.fn(),
  mockBatchSummaries: vi.fn(),
  mockEstimateTokenCount: vi.fn(),
  mockLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("encore.dev/log", () => ({
  default: mockLog,
}));

vi.mock("../../utils/token-estimator.util", () => ({
  batchSummaries: mockBatchSummaries,
  estimateTokenCount: mockEstimateTokenCount,
}));

vi.mock("../../config/prompts.config", () => ({
  MAP_REDUCE_MAP_PROMPT: "MAP_PROMPT {batch_summaries}",
  CLUSTER_SUMMARY_PROMPT:
    "CLUSTER_PROMPT slug:{cluster_slug} titles:{candidate_titles} tags:{cluster_tags} urgency:{cluster_urgency} formats:{cluster_formats} items:{cluster_items}",
  MAP_REDUCE_REDUCE_PROMPT:
    "REDUCE {cluster_briefs} ## TL;DR :: {digest_date} :: {total_items} :: {audio_count} :: {article_count} :: {spotlight_slug}",
  formatSourceName: vi.fn((source: string) => source),
}));

vi.mock("../../config/daily-digest.config", () => ({
  DAILY_DIGEST_CONFIG: {
    openaiModel: "gpt-4o-mini",
    temperature: 0.6,
    maxOutputTokens: 1200,
    maxTokensPerBatch: 2000,
  },
}));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class MockChatOpenAI {
    invoke = mockLLMInvoke;
  },
}));

vi.mock("langchain/chains", () => ({
  loadSummarizationChain: vi.fn(),
}));

vi.mock("@langchain/textsplitters", () => ({
  RecursiveCharacterTextSplitter: vi.fn(),
}));

vi.mock("@langchain/core/documents", () => ({
  Document: class MockDocument {
    pageContent: string;
    metadata: any;
    constructor(config: { pageContent: string; metadata?: any }) {
      this.pageContent = config.pageContent;
      this.metadata = config.metadata ?? {};
    }
  },
}));

import { MapReduceDigestService } from "../../services/map-reduce-digest.service";

describe("MapReduceDigestService (clustered narrative flow)", () => {
  let service: MapReduceDigestService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MapReduceDigestService("fake-api-key");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const makeItem = (
    id: number,
    summary: string,
    source: BookmarkSource,
    contentType: "audio" | "article",
    extra?: Partial<DigestContentItem>
  ): DigestContentItem => ({
    bookmark_id: id,
    summary,
    source,
    content_type: contentType,
    duration: contentType === "audio" ? 180 : undefined,
    word_count: contentType === "article" ? 800 : undefined,
    reading_minutes: contentType === "article" ? 5 : undefined,
    created_at: new Date(),
    ...extra,
  });

  it("produces final digest via structured map -> cluster -> reduce pipeline", async () => {
    const items: DigestContentItem[] = [
      makeItem(
        1,
        "Markets recap about tech stocks sliding on macro fears.",
        BookmarkSource.BLOG,
        "article",
        { title: "Tech stocks slide" }
      ),
      makeItem(
        2,
        "Another market clip covering bond yields and investor sentiment.",
        BookmarkSource.PODCAST,
        "audio",
        { title: "Bond yields up" }
      ),
      makeItem(
        3,
        "AI regulation debate from policy podcast.",
        BookmarkSource.PODCAST,
        "audio",
        { title: "AI regulation" }
      ),
    ];

    mockEstimateTokenCount.mockReturnValue(200);
    mockBatchSummaries.mockReturnValue([["summary1", "summary2"], ["summary3"]]);

    // Map phase responses (two batches)
    mockLLMInvoke
      .mockResolvedValueOnce({
        content: JSON.stringify([
          {
            item_number: 1,
            group_key: "market-pulse",
            segment_title: "Tech stocks wobble",
            headline: "Tech shares slide as yields climb",
            urgency_score: 5,
            urgency_label: "Immediate",
            why_it_matters:
              "Portfolio beta spikes as higher yields hammer growth positioning.",
            fast_facts: [
              "Nasdaq down 2.1% amid rate jitters",
              "Investors rotate into defensives",
            ],
            soundbite: "Traders call it a tantrum",
            format_cue: "📄 Quick read",
            action_step: "Skim the blog's chart pack",
            forward_signal: "Earnings calls later this week",
            tags: ["markets", "stocks"],
            source_notes: "long-form blog",
          },
          {
            item_number: 2,
            group_key: "market-pulse",
            segment_title: "Bond yields bite",
            headline: "Rising yields pressure growth names",
            urgency_score: 4,
            urgency_label: "High",
            why_it_matters:
              "Higher discount rates reset valuations and sour retail mood.",
            fast_facts: [
              "10-year yield pops above 4.6%",
              "Podcast guests flag retail sentiment drop",
            ],
            soundbite: "Bond desks see patience thin",
            format_cue: "🎧 Audio briefing",
            action_step: "Queue the yield segment for commute",
            forward_signal: "Eyes on CPI print tomorrow",
            tags: ["markets", "bonds"],
            source_notes: "podcast briefing",
          },
        ]),
      })
      .mockResolvedValueOnce({
        content: JSON.stringify([
          {
            item_number: 3,
            group_key: "ai-policy",
            segment_title: "Policy makers circle AI",
            headline: "Lawmakers draft enterprise AI guardrails",
            urgency_score: 3,
            urgency_label: "Watch",
            why_it_matters:
              "Could reshape go-to-market plans for regulated-sector AI startups.",
            fast_facts: [
              "Proposed bill targets transparency",
              "Startups warn of compliance costs",
            ],
            soundbite: "One senator calls it a safety net",
            format_cue: "🎧 Deep-dive podcast",
            action_step: "Save the hearing recap for later",
            forward_signal: "Expect hearings next month",
            tags: ["ai", "policy"],
            source_notes: "policy podcast",
          },
        ]),
      })
      // Cluster summary (market cluster)
      .mockResolvedValueOnce({
        content: JSON.stringify({
          segment_name: "Markets wobble under rate pressure",
          anchor_intro:
            "Tech shares stumbled as bond yields broke higher, forcing investors toward defensive havens while strategists braced for stickier inflation.",
          essential_points: [
            "Nasdaq slides 2.1% as yields climb",
            "Rotation hints at risk-off sentiment",
          ],
          highlight_soundbite: "Traders call the pullback a tantrum",
          recommended_action: "Skim the chart pack, then queue the bond clip",
          segue: "From the trading floor to the policy arena, momentum shifts.",
        }),
      })
      // Cluster summary (AI cluster)
      .mockResolvedValueOnce({
        content: JSON.stringify({
          segment_name: "AI regulation heats up",
          anchor_intro:
            "Policy makers sketched a transparency-first bill that could slow enterprise AI launches even as founders warn compliance drag may dampen innovation.",
          essential_points: [
            "Proposed bill prioritises transparency",
            "Startups worry about compliance costs",
          ],
          highlight_soundbite: "Lawmakers pitch it as a safety net",
          recommended_action: "Bookmark the hearing recap for a weekend listen",
          segue: "All eyes now shift to the next round of hearings.",
        }),
      })
      // Reduce phase output
      .mockResolvedValueOnce({
        content: "Final narrated digest",
      });

    const result = await service.generateDigest(items, {
      digestDate: "2025-01-15",
    });

    expect(result).toBe("Final narrated digest");
    expect(mockLLMInvoke).toHaveBeenCalledTimes(5);

    // Ensure cluster prompt bundled both market items
    const clusterPromptCall = mockLLMInvoke.mock.calls[2][0] as string;
    expect(clusterPromptCall).toContain("market-pulse");
    expect(clusterPromptCall).toContain("urgency:Immediate");
    expect(clusterPromptCall).toContain("formats:📄 Quick read | 🎧 Audio briefing");

    // Ensure reduce prompt received cluster briefs (no single-item leftovers)
    const reducePromptCall = mockLLMInvoke.mock.calls[4][0] as string;
    expect(reducePromptCall).toContain("Cluster 1");
    expect(reducePromptCall).toContain("Cluster 2");
    expect(reducePromptCall).toContain("## TL;DR");
    expect(reducePromptCall).toContain(":: market-pulse");
  });

  it("merges unique slugs when tags overlap", async () => {
    const items: DigestContentItem[] = [
      makeItem(
        1,
        "Macro wrap mention inflation and jobs.",
        BookmarkSource.BLOG,
        "article"
      ),
      makeItem(
        2,
        "Another macro snippet on inflation expectations.",
        BookmarkSource.YOUTUBE,
        "audio"
      ),
    ];

    mockEstimateTokenCount.mockReturnValue(150);
    mockBatchSummaries.mockReturnValue([["summary1", "summary2"]]);

    mockLLMInvoke
      .mockResolvedValueOnce({
        content: JSON.stringify([
          {
            item_number: 1,
            group_key: "inflation-watch",
            segment_title: "Inflation watch",
            headline: "CPI momentum stays sticky",
            urgency_score: 4,
            urgency_label: "High",
            why_it_matters:
              "Signals a tough path for rate cuts this quarter.",
            fast_facts: ["Core CPI at 3.2%", "Wage growth slows"],
            soundbite: "Economists call it a grind",
            format_cue: "📄 Quick read",
            action_step: "Skim the inflation chart pack",
            forward_signal: "Watch Friday's jobs report",
            tags: ["economy", "inflation"],
            source_notes: "macro blog",
          },
          {
            item_number: 2,
            group_key: "macro-brief",
            segment_title: "Macro brief",
            headline: "Bond desks price slower cuts",
            urgency_score: 4,
            urgency_label: "High",
            why_it_matters:
              "Markets brace for higher-for-longer narrative.",
            fast_facts: ["Swaps imply two cuts", "Breakevens steady"],
            soundbite: "Desk chatter says patience",
            format_cue: "🎧 Audio briefing",
            action_step: "Queue the macro recap",
            forward_signal: "FOMC minutes next week",
            tags: ["inflation", "macro"],
            source_notes: "youtube recap",
          },
        ]),
      })
      // Only one cluster summary call if merged correctly
      .mockResolvedValueOnce({
        content: JSON.stringify({
          segment_name: "Inflation story stays centre stage",
          anchor_intro:
            "Sticky CPI data and bond desks’ hedges suggest the rate-cut story is cooling, with traders eyeing jobs numbers for confirmation.",
          essential_points: [
            "Core CPI 3.2% keeps pressure on Fed",
            "Rate-cut bets cool as swaps reprice",
          ],
          highlight_soundbite: "Economists call the path a grind",
          recommended_action: "Skim the chart pack then queue the macro recap",
          segue: "From macro to tech, other trends emerged.",
        }),
      })
      .mockResolvedValueOnce({ content: "Final merged digest" });

    const result = await service.generateDigest(items, {
      digestDate: "2025-01-16",
    });

    expect(result).toBe("Final merged digest");
    expect(mockLLMInvoke).toHaveBeenCalledTimes(3); // map (1), cluster (1), reduce (1)
  });
});
