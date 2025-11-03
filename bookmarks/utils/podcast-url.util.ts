export type PodcastPlatform = 'rss' | 'apple' | 'google' | 'unknown';

export interface PodcastUrlInfo {
  platform: PodcastPlatform;
  showId?: string;
  feedUrl?: string;
}

/**
 * iTunes API response type
 */
interface ITunesLookupResponse {
  resultCount: number;
  results: Array<{
    feedUrl?: string;
    collectionName?: string;
    artistName?: string;
  }>;
}

/**
 * Detects podcast platform and extracts IDs/feed URL from URL
 * @param url - Podcast episode or feed URL
 * @returns Parsed URL information with platform and IDs
 */
export function parsePodcastUrl(url: string): PodcastUrlInfo {
  // Apple Podcasts: https://podcasts.apple.com/us/podcast/name/id123456?i=789
  const appleMatch = url.match(/podcasts\.apple\.com.*\/id(\d+)/);
  if (appleMatch) {
    return {
      platform: 'apple',
      showId: appleMatch[1],
    };
  }

  // Google Podcasts: https://podcasts.google.com/feed/[base64_rss_url]
  const googleMatch = url.match(/podcasts\.google\.com\/feed\/([^\/\?]+)/);
  if (googleMatch) {
    try {
      const feedUrl = Buffer.from(googleMatch[1], 'base64').toString('utf-8');

      // Validate decoded URL
      new URL(feedUrl); // Throws if invalid

      return { platform: 'google', feedUrl };
    } catch (error) {
      throw new Error(
        `Invalid Google Podcasts URL format: failed to decode feed URL (${error instanceof Error ? error.message : String(error)})`
      );
    }
  }

  // RSS Direct: Contains .xml or /feed/ or /rss/
  if (url.includes('.xml') || url.includes('/feed') || url.includes('/rss')) {
    return { platform: 'rss', feedUrl: url };
  }

  return { platform: 'unknown' };
}

/**
 * Gets RSS feed URL from Apple Podcasts show ID using iTunes API
 * @param showId - Apple Podcasts show ID
 * @returns RSS feed URL
 * @throws Error if RSS feed not found or API fails
 */
export async function getApplePodcastRss(showId: string): Promise<string> {
  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${showId}&entity=podcast`
  );

  if (!response.ok) {
    throw new Error(
      `iTunes API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as ITunesLookupResponse;

  if (!data.results || data.results.length === 0) {
    throw new Error(
      `No podcast found for Apple Podcasts ID: ${showId}`
    );
  }

  const feedUrl = data.results[0]?.feedUrl;
  if (!feedUrl) {
    throw new Error('RSS feed not found for this Apple Podcast');
  }

  return feedUrl;
}
