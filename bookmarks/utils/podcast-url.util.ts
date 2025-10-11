export type PodcastPlatform = 'rss' | 'apple' | 'google' | 'unknown';

export interface PodcastUrlInfo {
  platform: PodcastPlatform;
  showId?: string;
  feedUrl?: string;
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
      return { platform: 'google', feedUrl };
    } catch {
      // If decode fails, treat as unknown
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
 * @throws Error if RSS feed not found
 */
export async function getApplePodcastRss(showId: string): Promise<string> {
  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${showId}&entity=podcast`
  );
  const data = (await response.json()) as any;

  if (!data.results?.[0]?.feedUrl) {
    throw new Error('RSS feed not found for this Apple Podcast');
  }

  return data.results[0].feedUrl;
}
