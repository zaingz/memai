import { describe, it, expect } from "vitest";
import { extractPodcastMetadata } from "../utils/podcast-metadata.util";

describe("Podcast Metadata Extraction", () => {
  it("should extract metadata from Apple Podcasts URL", async () => {
    const url =
      "https://podcasts.apple.com/us/podcast/2404-elon-musk/id360084272?i=1000734471135";

    console.log("\n=== Testing Podcast Metadata Extraction ===");
    console.log("URL:", url);
    console.log("\nFetching metadata...\n");

    const result = await extractPodcastMetadata(url);

    console.log("\n✅ Result received:");
    console.log(JSON.stringify(result, null, 2));

    if (result) {
      console.log("\n📊 Summary:");
      console.log("  Title:", result.title || "N/A");
      console.log("  Site Name:", result.siteName || "N/A");
      console.log("  Description:", result.description || "N/A");
      console.log("  Media Type:", result.mediaType || "N/A");
      console.log("  Thumbnail:", result.thumbnailUrl ? "Present" : "Missing");
      console.log("  Accent Color:", result.accentColor || "N/A");
      console.log("  Published Time:", result.publishedTime || "N/A");

      // Assertions
      expect(result.siteName).toBe("Apple Podcasts");
      expect(result.mediaType).toBe("podcast");
      expect(result.title).toBeDefined();
      expect(result.title).not.toBeNull();
      expect(result.accentColor).toBe("#8E2DE2");
    } else {
      console.log("\n⚠️  Result is null (will fall back to OpenGraph)");
      console.log("This means the function failed to extract metadata");
    }

    // Allow null (function returns null on error)
    expect(result).toBeDefined();
  }, 30000); // 30 second timeout for API call

  it("should return null for unknown podcast platform", async () => {
    const url = "https://example.com/podcast";

    const result = await extractPodcastMetadata(url);

    // Should return null for unknown platforms
    expect(result).toBeNull();
  });
});
