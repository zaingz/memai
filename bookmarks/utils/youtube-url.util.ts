import { YOUTUBE_URL_PATTERNS } from "../config/transcription.config";

/**
 * Extracts YouTube video ID from various YouTube URL formats
 * @param url - YouTube URL
 * @returns Video ID or null if invalid
 */
export function extractYouTubeVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Constructs a standard YouTube watch URL from a video ID
 * @param videoId - YouTube video ID
 * @returns Standard YouTube watch URL
 */
export function buildYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
