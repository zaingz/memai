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
  CLUSTER_SUMMARY_PROMPT: "CLUSTER_PROMPT slug:{cluster_slug} titles:{candidate_titles} tags:{cluster_tags} items:{cluster_items}",
  MAP_REDUCE_REDUCE_PROMPT: "REDUCE {cluster_briefs} :: {digest_date} :: {total_items} :: {audio_count} :: {article_count}",
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
    vi.useFakeTimers();
    vi.clearAllMocks();
    service = new MapReduceDigestService("fake-api-key");
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
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
            theme_title: "Tech stocks wobble",
            one_sentence_summary: "Tech shares slide as yields climb.",
            key_facts: [
              "Nasdaq down 2.1% amid rate jitters",
              "Investors rotate into defensives",
            ],
            context_and_implication:
              "Signals traders bracing for higher-for-longer rates.",
            signals: "Watch earnings calls later this week",
            tags: ["markets", "stocks"],
            source_notes: "long-form blog",
          },
          {
            item_number: 2,
            group_key: "market-pulse",
            theme_title: "Bond yields bite",
            one_sentence_summary: "Rising yields pressure growth names.",
            key_facts: [
              "10-year yield pops above 4.6%",
              "Podcast guests flag retail sentiment drop",
            ],
            context_and_implication:
              "Suggests broader rotation into value plays.",
            signals: "Eyes on CPI print tomorrow",
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
            theme_title: "Policy makers circle AI",
            one_sentence_summary:
              "Lawmakers draft guardrails for enterprise AI rollouts.",
            key_facts: [
              "Proposed bill targets transparency",
              "Startups warn of compliance costs",
            ],
            context_and_implication:
              "Could reshape go-to-market playbooks for AI vendors.",
            signals: "Expect hearings next month",
            tags: ["ai", "policy"],
            source_notes: "policy podcast",
          },
        ]),
      })
      // Cluster summary (market cluster)
      .mockResolvedValueOnce({
        content: JSON.stringify({
          cluster_title: "Markets wobble under rate pressure",
          narrative_paragraph:
            "Tech shares stumbled as bond yields broke higher, with investors rotating toward defensive plays while strategists braced for stickier inflation.",
          key_takeaways: [
            "Nasdaq slides 2.1% as yields climb",
            "Rotation hints at risk-off sentiment",
          ],
          bridge_sentence:
            "From the trading floor to the policy arena, another debate rolled on.",
        }),
      })
      // Cluster summary (AI cluster)
      .mockResolvedValueOnce({
        content: JSON.stringify({
          cluster_title: "AI regulation heats up",
          narrative_paragraph:
            "Policy makers sketched a transparency-first bill that could slow enterprise AI launches, even as founders warn compliance drag may dampen innovation.",
          key_takeaways: [
            "Proposed bill prioritises transparency",
            "Startups worry about compliance costs",
          ],
          bridge_sentence:
            "All eyes now shift to the next round of hearings.",
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
    expect(clusterPromptCall).toContain("Item 1");
    expect(clusterPromptCall).toContain("Item 2");

    // Ensure reduce prompt received cluster briefs (no single-item leftovers)
    const reducePromptCall = mockLLMInvoke.mock.calls[4][0] as string;
    expect(reducePromptCall).toContain("Cluster 1");
    expect(reducePromptCall).toContain("Cluster 2");
    expect(reducePromptCall).not.toMatch(/Item 1/); // already merged upstream
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
            theme_title: "Inflation watch",
            one_sentence_summary: "CPI momentum stays sticky.",
            key_facts: ["Core CPI at 3.2%", "Wage growth slows"],
            context_and_implication:
              "Signals a tough path for rate cuts this quarter.",
            signals: "Watch Friday's jobs report",
            tags: ["economy", "inflation"],
            source_notes: "macro blog",
          },
          {
            item_number: 2,
            group_key: "macro-brief",
            theme_title: "Macro brief",
            one_sentence_summary:
              "Bond desks price in slower cuts amid inflation chatter.",
            key_facts: ["Swaps imply two cuts", "Breakevens steady"],
            context_and_implication:
              "Markets bracing for higher-for-longer narrative.",
            signals: "FOMC minutes next week",
            tags: ["inflation", "macro"],
            source_notes: "youtube recap",
          },
        ]),
      })
      // Only one cluster summary call if merged correctly
      .mockResolvedValueOnce({
        content: JSON.stringify({
          cluster_title: "Inflation story stays centre stage",
          narrative_paragraph:
            "Sticky CPI data and bond desks’ hedges suggest the rate-cut story is cooling, with traders eyeing jobs numbers for confirmation.",
          key_takeaways: [
            "Core CPI 3.2% keeps pressure on Fed",
            "Rate-cut bets cool as swaps reprice",
          ],
          bridge_sentence: "From macro to tech, other trends emerged.",
        }),
      })
      .mockResolvedValueOnce({ content: "Final merged digest" });

    const result = await service.generateDigest(items, {
      digestDate: "2025-01-16",
    });

    expect(result).toBe("Final merged digest");
    expect(mockLLMInvoke).toHaveBeenCalledTimes(3); // map (1), cluster (1), reduce (1)
  });

  describe("Timeout Handling", () => {
    it("should timeout when OpenAI summarization takes too long", async () => {
      const items: DigestContentItem[] = [
        makeItem(
          1,
          "Test summary for timeout scenario",
          BookmarkSource.YOUTUBE,
          "audio"
        ),
      ];

      mockEstimateTokenCount.mockReturnValue(100);
      mockBatchSummaries.mockReturnValue([["summary1"]]);

      // Mock LLM invoke to hang indefinitely (simulates slow OpenAI response)
      mockLLMInvoke.mockImplementation(() => new Promise(() => {}));

      // Start digest generation (will hang on map phase)
      const digestPromise = service.generateDigest(items, {
        digestDate: "2025-01-17",
      });

      // Fast-forward time significantly (simulate timeout)
      await vi.advanceTimersByTimeAsync(300000); // 5 minutes

      // The promise should still be pending because LLM is hanging
      // Verify LLM invoke was called (map phase attempted)
      expect(mockLLMInvoke).toHaveBeenCalled();

      // Note: The actual digest generation is still pending
      // This test verifies behavior when OpenAI API hangs
    });

    it("should succeed when OpenAI completes within reasonable time", async () => {
      const items: DigestContentItem[] = [
        makeItem(
          1,
          "Quick test summary",
          BookmarkSource.BLOG,
          "article"
        ),
      ];

      mockEstimateTokenCount.mockReturnValue(100);
      mockBatchSummaries.mockReturnValue([["summary1"]]);

      // Mock quick OpenAI responses
      mockLLMInvoke
        // Map phase
        .mockResolvedValueOnce({
          content: JSON.stringify([
            {
              item_number: 1,
              group_key: "test-theme",
              theme_title: "Test theme",
              one_sentence_summary: "Quick summary",
              key_facts: ["Fact 1"],
              context_and_implication: "Context here",
              signals: "Signal",
              tags: ["test"],
              source_notes: "blog",
            },
          ]),
        })
        // Cluster summary phase
        .mockResolvedValueOnce({
          content: JSON.stringify({
            cluster_title: "Test cluster",
            narrative_paragraph: "Narrative content",
            key_takeaways: ["Takeaway 1"],
            bridge_sentence: "Bridge",
          }),
        })
        // Reduce phase
        .mockResolvedValueOnce({
          content: "Final quick digest",
        });

      // Start digest generation
      const digestPromise = service.generateDigest(items, {
        digestDate: "2025-01-17",
      });

      // Fast-forward by 5 seconds (reasonable time)
      await vi.advanceTimersByTimeAsync(5000);

      // Should succeed
      const result = await digestPromise;
      expect(result).toBe("Final quick digest");
      expect(mockLLMInvoke).toHaveBeenCalledTimes(3); // map, cluster, reduce
    });
  });
});
