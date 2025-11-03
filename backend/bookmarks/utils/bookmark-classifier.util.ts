import { BookmarkSource } from "../types/domain.types";
import { extractYouTubeVideoId } from "./youtube-url.util";
import { parsePodcastUrl } from "./podcast-url.util";

/**
 * Classifies a bookmark URL to determine its source type
 * Uses heuristics and regex patterns to detect YouTube, Podcast, and other sources
 * Future: Can be replaced with ML-based classification
 *
 * @param url - The bookmark URL to classify
 * @returns The detected BookmarkSource type
 */
export function classifyBookmarkUrl(url: string): BookmarkSource {
  // YouTube detection
  const youtubeVideoId = extractYouTubeVideoId(url);
  if (youtubeVideoId) {
    return BookmarkSource.YOUTUBE;
  }

  // Podcast detection
  const podcastInfo = parsePodcastUrl(url);
  if (podcastInfo.platform !== 'unknown') {
    return BookmarkSource.PODCAST;
  }

  // Reddit detection
  if (url.includes('reddit.com/r/') || url.includes('redd.it/')) {
    return BookmarkSource.REDDIT;
  }

  // Twitter/X detection
  if (url.includes('twitter.com/') || url.includes('x.com/')) {
    return BookmarkSource.TWITTER;
  }

  // LinkedIn detection
  if (url.includes('linkedin.com/')) {
    return BookmarkSource.LINKEDIN;
  }

  // Blog detection heuristics
  // Common blog platforms and patterns
  if (
    url.includes('medium.com/') ||
    url.includes('substack.com/') ||
    url.includes('wordpress.com/') ||
    url.includes('blogspot.com/') ||
    url.includes('ghost.io/') ||
    url.includes('/blog/') ||
    url.includes('/article/')
  ) {
    return BookmarkSource.BLOG;
  }

  // Default to web if no specific pattern matches
  return BookmarkSource.WEB;
}
