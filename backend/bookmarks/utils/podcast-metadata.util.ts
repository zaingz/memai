import log from "encore.dev/log";
import { parsePodcastUrl, getApplePodcastRss } from "./podcast-url.util";
import parsePodcast from "node-podcast-parser";
import type { LinkPreviewMetadata } from "../services/link-preview.service";

/**
 * Extended ParsedPodcast type with show-level metadata
 * node-podcast-parser doesn't ship with TypeScript types
 */
interface ParsedPodcastWithMetadata {
  title?: string;
  description?: {
    short?: string;
    long?: string;
  };
  link?: string;
  image?: string;
  language?: string;
  copyright?: string;
  updated?: string;
  explicit?: boolean;
  categories?: string[];
  author?: string;
  owner?: {
    name?: string;
    email?: string;
  };
  episodes?: Array<{
    guid?: string;
    title?: string;
    description?: string;
    explicit?: boolean;
    image?: string;
    published?: string;
    duration?: number;
    categories?: string[];
    enclosure?: {
      filesize?: number;
      type?: string;
      url?: string;
    };
  }>;
}

/**
 * iTunes API response type for podcast lookup
 */
interface ITunesLookupResult {
  feedUrl?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  trackCount?: number;
  collectionViewUrl?: string;
}

interface ITunesApiResponse {
  resultCount: number;
  results: ITunesLookupResult[];
}

/**
 * Extracts podcast metadata for display purposes (not audio download)
 * Uses iTunes API for Apple Podcasts and RSS feed parsing for others
 * @param url - Podcast episode URL
 * @returns Link preview metadata with podcast-specific information
 */
export async function extractPodcastMetadata(
  url: string
): Promise<LinkPreviewMetadata | null> {
  try {
    log.info("Extracting podcast metadata", { url });

    const urlInfo = parsePodcastUrl(url);

    // Handle Apple Podcasts with iTunes API
    if (urlInfo.platform === "apple" && urlInfo.showId) {
      return await extractApplePodcastsMetadata(url, urlInfo.showId);
    }

    // Handle RSS feeds directly
    if (urlInfo.platform === "rss" && urlInfo.feedUrl) {
      return await extractRssFeedMetadata(url, urlInfo.feedUrl);
    }

    // Handle Google Podcasts (has RSS feed URL)
    if (urlInfo.platform === "google" && urlInfo.feedUrl) {
      return await extractRssFeedMetadata(url, urlInfo.feedUrl);
    }

    // Unknown platform - return null to fall back to OpenGraph
    log.warn("Unknown podcast platform, falling back to OpenGraph", {
      url,
      platform: urlInfo.platform,
    });
    return null;
  } catch (error) {
    log.warn(error, "Failed to extract podcast metadata", { url });
    return null;
  }
}

/**
 * Extracts metadata from Apple Podcasts using iTunes Search API
 * This bypasses OpenGraph scraping which Apple blocks
 */
async function extractApplePodcastsMetadata(
  url: string,
  showId: string
): Promise<LinkPreviewMetadata | null> {
  try {
    log.info("Fetching Apple Podcasts metadata from iTunes API", { showId });

    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${showId}&entity=podcast`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `iTunes API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ITunesApiResponse;

    if (!data.results || data.results.length === 0) {
      throw new Error(`No podcast found for Apple Podcasts ID: ${showId}`);
    }

    const podcast = data.results[0];

    // Extract high-quality artwork (600x600 preferred)
    const thumbnailUrl = podcast.artworkUrl600 || podcast.artworkUrl100 || null;

    // Build metadata
    const metadata: LinkPreviewMetadata = {
      url,
      title: podcast.collectionName || null,
      description: podcast.artistName
        ? `By ${podcast.artistName}${podcast.primaryGenreName ? ` · ${podcast.primaryGenreName}` : ""}`
        : null,
      siteName: "Apple Podcasts",
      mediaType: "podcast",
      favicon: "https://www.apple.com/favicon.ico",
      thumbnailUrl,
      accentColor: "#8E2DE2", // Apple Podcasts purple gradient color
      publishedTime: podcast.releaseDate || null,
      fetchedAt: new Date().toISOString(),
    };

    log.info("Apple Podcasts metadata extracted", {
      showId,
      title: metadata.title,
      hasThumbnail: !!metadata.thumbnailUrl,
    });

    return metadata;
  } catch (error) {
    log.error(error, "Failed to fetch Apple Podcasts metadata from iTunes API", {
      showId,
    });
    return null;
  }
}

/**
 * Extracts metadata from RSS feed
 * Used for direct RSS URLs or Google Podcasts
 */
async function extractRssFeedMetadata(
  url: string,
  feedUrl: string
): Promise<LinkPreviewMetadata | null> {
  try {
    log.info("Fetching podcast metadata from RSS feed", { feedUrl });

    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch RSS feed: ${response.status} ${response.statusText}`
      );
    }

    const xmlData = await response.text();

    // Parse RSS feed
    const podcast = await new Promise<ParsedPodcastWithMetadata>(
      (resolve, reject) => {
        parsePodcast(xmlData, (err, data) => {
          if (err) reject(err);
          else resolve(data as ParsedPodcastWithMetadata);
        });
      }
    );

    // Extract show-level metadata
    const metadata: LinkPreviewMetadata = {
      url,
      title: podcast.title || null,
      description: podcast.description?.short || podcast.description?.long || null,
      siteName: podcast.link || extractHostname(feedUrl),
      mediaType: "podcast",
      favicon: podcast.link
        ? `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(podcast.link)}`
        : null,
      thumbnailUrl: podcast.image || null,
      accentColor: "#FF6B6B", // Generic podcast red color
      publishedTime: podcast.updated ? new Date(podcast.updated).toISOString() : null,
      fetchedAt: new Date().toISOString(),
    };

    log.info("RSS feed metadata extracted", {
      feedUrl,
      title: metadata.title,
      hasThumbnail: !!metadata.thumbnailUrl,
    });

    return metadata;
  } catch (error) {
    log.error(error, "Failed to parse RSS feed metadata", { feedUrl });
    return null;
  }
}

/**
 * Extracts hostname from URL for siteName fallback
 */
function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}
