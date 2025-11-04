import log from "encore.dev/log";
import { buildYouTubeUrl } from "../utils/youtube-url.util";

/**
 * YouTube metadata extracted from web scraping
 */
export interface YouTubeMetadata {
  title: string;
  description?: string;
  duration: number; // seconds
  uploader: string; // channel name
  uploader_id?: string;
  uploader_url?: string;
  channel_id?: string;
  view_count?: number;
  like_count?: number;
  upload_date?: string; // YYYYMMDD format
  thumbnail?: string;
  tags?: string[];
  categories?: string[];
  age_limit?: number;
  webpage_url: string;
  fulltitle?: string;
}

/**
 * Service for extracting YouTube metadata using web scraping
 * Works on Encore Cloud without system dependencies
 */
export class YouTubeDownloaderService {
  /**
   * Extracts metadata from YouTube video using web scraping
   * Works on Encore Cloud without system dependencies
   * @param videoId - YouTube video ID
   * @returns YouTube metadata
   * @throws Error if metadata extraction fails
   */
  async extractMetadata(videoId: string): Promise<YouTubeMetadata> {
    const youtubeUrl = buildYouTubeUrl(videoId);

    log.info("Extracting YouTube metadata via web scraping", { videoId, youtubeUrl });

    try {
      // Fetch the YouTube page HTML
      const response = await fetch(youtubeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`YouTube request failed: ${response.status}`);
      }

      const html = await response.text();

      // Extract metadata from embedded JSON in the page
      const ytInitialDataMatch = html.match(/var ytInitialData = ({.*?});/);
      const ytInitialPlayerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.*?});/);

      if (!ytInitialPlayerResponseMatch) {
        throw new Error('Could not extract player response from YouTube page');
      }

      const playerResponse = JSON.parse(ytInitialPlayerResponseMatch[1]);
      const videoDetails = playerResponse.videoDetails || {};
      const microformat = playerResponse.microformat?.playerMicroformatRenderer || {};

      // Extract metadata from the parsed JSON
      const result: YouTubeMetadata = {
        title: videoDetails.title || microformat.title?.simpleText || 'Untitled',
        description: videoDetails.shortDescription || microformat.description?.simpleText,
        duration: parseInt(videoDetails.lengthSeconds || '0'),
        uploader: videoDetails.author || microformat.ownerChannelName || 'Unknown',
        uploader_id: undefined,
        uploader_url: microformat.ownerProfileUrl,
        channel_id: videoDetails.channelId,
        view_count: parseInt(videoDetails.viewCount || '0'),
        like_count: undefined, // Not available in initial data
        upload_date: microformat.publishDate?.replace(/-/g, ''),
        thumbnail: videoDetails.thumbnail?.thumbnails?.[videoDetails.thumbnail.thumbnails.length - 1]?.url ||
                   `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        tags: videoDetails.keywords || [],
        categories: microformat.category ? [microformat.category] : [],
        age_limit: 0,
        webpage_url: youtubeUrl,
        fulltitle: videoDetails.title,
      };

      log.info("YouTube metadata extracted successfully", {
        videoId,
        title: result.title,
        duration: result.duration,
        uploader: result.uploader,
        viewCount: result.view_count,
      });

      return result;
    } catch (error) {
      log.error(error, "Failed to extract YouTube metadata", { videoId });

      // Fallback: Return basic metadata with just thumbnail
      log.warn("Using fallback metadata with basic info", { videoId });
      return {
        title: 'YouTube Video',
        duration: 0,
        uploader: 'Unknown',
        webpage_url: youtubeUrl,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  }
}
