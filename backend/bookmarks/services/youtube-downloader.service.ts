import { promisify } from "util";
import { exec as execCallback } from "child_process";
import fs from "fs";
import log from "encore.dev/log";
import { YOUTUBE_CONFIG } from "../config/transcription.config";
import { buildYouTubeUrl } from "../utils/youtube-url.util";
import { audioFilesBucket } from "../storage";

const exec = promisify(execCallback);

/**
 * Find yt-dlp binary path
 * Checks common installation locations in order
 */
function findYtDlpPath(): string {
  const paths = [
    "/opt/homebrew/bin/yt-dlp", // ARM Mac (M1/M2/M3)
    "/usr/local/bin/yt-dlp",    // Intel Mac
    "yt-dlp",                    // Fallback to PATH
  ];

  for (const path of paths) {
    try {
      if (path.startsWith("/") && fs.existsSync(path)) {
        return path;
      }
    } catch {
      // Skip if can't check existence
    }
  }

  // Fallback to just "yt-dlp" and let PATH handle it
  return "yt-dlp";
}

const YT_DLP_PATH = findYtDlpPath();

// Log detected path on startup
log.info("YouTube downloader initialized", {
  ytDlpPath: YT_DLP_PATH,
  isFullPath: YT_DLP_PATH.startsWith("/"),
});

/**
 * YouTube metadata extracted from yt-dlp
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
 * Service for downloading YouTube audio and uploading to Encore bucket
 */
export class YouTubeDownloaderService {
  /**
   * Extracts metadata from YouTube video using web scraping (yt-dlp fallback)
   * This works on Encore Cloud without system dependencies
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

  /**
   * Downloads audio from YouTube and uploads to bucket
   * @param videoId - YouTube video ID
   * @param bookmarkId - Bookmark ID (for unique bucket key)
   * @returns Bucket key for the uploaded audio file
   * @throws Error if download or upload fails
   */
  async downloadAndUpload(
    videoId: string,
    bookmarkId: number
  ): Promise<string> {
    const youtubeUrl = buildYouTubeUrl(videoId);
    const tempPath = YOUTUBE_CONFIG.getTempPath(videoId);
    const bucketKey = `audio-${bookmarkId}-${videoId}.mp3`;

    log.info("Downloading YouTube audio with yt-dlp", {
      videoId,
      bookmarkId,
      youtubeUrl,
      tempPath,
      bucketKey,
    });

    try {
      // Download audio to temp file
      const { stdout, stderr } = await exec(
        `${YT_DLP_PATH} -x --audio-format ${YOUTUBE_CONFIG.audioFormat} --audio-quality ${YOUTUBE_CONFIG.audioQuality} -o "${tempPath}" "${youtubeUrl}"`
      );

      if (stderr && !stderr.includes("Deleting original file")) {
        log.warn("yt-dlp stderr output", { stderr });
      }

      const fileSize = fs.statSync(tempPath).size;
      log.info("Audio download completed, uploading to bucket", {
        videoId,
        bookmarkId,
        tempPath,
        fileSize,
        bucketKey,
      });

      // Upload to Encore bucket
      const audioBuffer = fs.readFileSync(tempPath);
      await audioFilesBucket.upload(bucketKey, audioBuffer, {
        contentType: "audio/mpeg",
      });

      log.info("Audio uploaded to bucket", {
        videoId,
        bookmarkId,
        bucketKey,
        size: audioBuffer.length,
      });

      // Clean up temp file
      fs.unlinkSync(tempPath);

      return bucketKey;
    } catch (error) {
      // Try to clean up temp file even on error
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        log.warn(cleanupError, "Failed to clean up temp file", { tempPath });
      }

      log.error(error, "Failed to download and upload YouTube audio", {
        videoId,
        bookmarkId,
      });
      throw new Error(
        `Failed to download YouTube audio: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
