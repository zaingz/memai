import { spawn } from "child_process";
import fs from "fs";
import log from "encore.dev/log";
import { audioFilesBucket } from "../storage";
import { parsePodcastUrl, getApplePodcastRss } from "../utils/podcast-url.util";
import parsePodcast from "node-podcast-parser";
import ogs from "open-graph-scraper";
import fuzzysort from "fuzzysort";

// Configuration constants
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB limit
const DOWNLOAD_TIMEOUT = 120000; // 2 minutes
const FETCH_TIMEOUT = 30000; // 30 seconds for HTTP requests
const MIN_FUZZY_MATCH_SCORE = -1000; // Minimum score for episode matching

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * Service for downloading podcast audio and uploading to Encore bucket
 * Mirrors YouTubeDownloaderService but for podcast episodes
 */
export class PodcastDownloaderService {
  /**
   * Downloads audio from podcast episode and uploads to bucket
   * Full flow: Episode URL → RSS feed → Episode matching → Audio download → Bucket upload
   * @param episodeUrl - Podcast episode URL (or RSS feed URL for latest episode)
   * @param bookmarkId - Bookmark ID (for unique bucket key)
   * @returns Bucket key for the uploaded audio file
   * @throws Error if download or upload fails
   */
  async downloadAndUpload(
    episodeUrl: string,
    bookmarkId: number
  ): Promise<string> {
    log.info("Processing podcast episode", { episodeUrl, bookmarkId });

    // 1. Get RSS feed URL from episode URL
    const rssFeedUrl = await this.getRssFeedUrl(episodeUrl);
    log.info("Resolved RSS feed URL", { rssFeedUrl, bookmarkId });

    // 2. Get episode title from URL (OpenGraph metadata)
    const episodeTitle = await this.getEpisodeTitle(episodeUrl);
    log.info("Extracted episode title", { episodeTitle, bookmarkId });

    // 3. Parse RSS feed and find episode by title
    const audioUrl = await this.findEpisodeAudioUrl(rssFeedUrl, episodeTitle);
    log.info("Found episode audio URL", { audioUrl, bookmarkId });

    // 4. Download audio from direct URL and upload to bucket
    return await this.downloadAudioFromUrl(audioUrl, bookmarkId);
  }

  /**
   * Converts episode URL to RSS feed URL based on platform
   * @param episodeUrl - Podcast episode or feed URL
   * @returns RSS feed URL
   * @throws Error if platform not supported or RSS feed not found
   */
  private async getRssFeedUrl(episodeUrl: string): Promise<string> {
    const urlInfo = parsePodcastUrl(episodeUrl);

    switch (urlInfo.platform) {
      case 'rss':
        return urlInfo.feedUrl!;

      case 'apple':
        return await getApplePodcastRss(urlInfo.showId!);

      case 'google':
        return urlInfo.feedUrl!;

      default:
        throw new Error(`Unsupported podcast URL format: ${episodeUrl}`);
    }
  }

  /**
   * Extracts episode title from URL using OpenGraph metadata
   * Falls back to latest episode if extraction fails (e.g., Apple Podcasts blocks scraping)
   * @param episodeUrl - Podcast episode URL
   * @returns Episode title, or empty string to use latest episode
   */
  private async getEpisodeTitle(episodeUrl: string): Promise<string> {
    // If it's an RSS feed URL, return empty string (will use latest episode)
    if (
      episodeUrl.includes('.xml') ||
      episodeUrl.includes('/feed/') ||
      episodeUrl.includes('/rss/')
    ) {
      return '';
    }

    try {
      const { result, error: ogsError } = await ogs({
        url: episodeUrl,
        timeout: 10000, // 10 second timeout
        fetchOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      });

      if (ogsError) {
        throw new Error(`OpenGraph scraping failed: ${result.error || 'Unknown error'}`);
      }

      const title = result.ogTitle || result.twitterTitle || '';

      if (!title) {
        throw new Error('No title found in OpenGraph metadata');
      }

      // Clean up title (remove show name suffix if present)
      return this.cleanEpisodeTitle(title);
    } catch (error: any) {
      const errorMsg = error.error || error.message || String(error);
      log.warn("Failed to extract episode title, will use latest episode from RSS feed", {
        episodeUrl,
        errorMsg,
      });

      // Fallback: use latest episode from RSS feed (return empty string)
      // This handles cases where platforms (like Apple Podcasts) block web scraping
      return '';
    }
  }

  /**
   * Cleans episode title by removing common show name suffixes
   * Example: "Episode 123: Title - Show Name" → "Episode 123: Title"
   */
  private cleanEpisodeTitle(title: string): string {
    return title
      .replace(/\s*[-–|]\s*[^-–|]+\s*(podcast|show)\s*$/i, '')
      .trim();
  }

  /**
   * Finds episode audio URL by fuzzy matching title in RSS feed
   * @param rssFeedUrl - Podcast RSS feed URL
   * @param episodeTitle - Episode title to search for (empty string = latest episode)
   * @returns Direct audio file URL
   * @throws Error if episode not found or RSS parsing fails
   */
  private async findEpisodeAudioUrl(
    rssFeedUrl: string,
    episodeTitle: string
  ): Promise<string> {
    // Fetch RSS feed with timeout
    const response = await fetchWithTimeout(rssFeedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }

    const xmlData = await response.text();

    // Parse RSS feed using node-podcast-parser
    const podcast = await new Promise<import('node-podcast-parser').ParsedPodcast>(
      (resolve, reject) => {
        parsePodcast(xmlData, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      }
    );

    if (!podcast.episodes || podcast.episodes.length === 0) {
      throw new Error('No episodes found in RSS feed');
    }

    // If episodeTitle is empty (RSS feed URL provided), use latest episode
    if (!episodeTitle) {
      log.info("Using latest episode from RSS feed", { rssFeedUrl });
      const latestEpisode = podcast.episodes[0];

      if (!latestEpisode.enclosure?.url) {
        throw new Error('Latest episode has no audio URL');
      }

      log.info("Selected latest episode", {
        title: latestEpisode.title,
        audioUrl: latestEpisode.enclosure.url,
      });

      return latestEpisode.enclosure.url;
    }

    // Fuzzy match episode title with minimum score threshold
    const episodeTitles = podcast.episodes.map((ep) => ep.title);
    const results = fuzzysort.go(episodeTitle, episodeTitles, {
      threshold: MIN_FUZZY_MATCH_SCORE,
      limit: 5, // Get top 5 matches for logging
    });

    if (results.length === 0 || results[0].score < MIN_FUZZY_MATCH_SCORE) {
      log.warn("No good episode match found", {
        searchTitle: episodeTitle,
        availableTitles: episodeTitles.slice(0, 5),
        bestScore: results[0]?.score,
      });
      throw new Error(
        `Episode "${episodeTitle}" not found in RSS feed (no close matches)`
      );
    }

    // Get best match (highest score)
    const bestMatchIndex = results[0].target ? episodeTitles.indexOf(results[0].target) : 0;
    const matchedEpisode = podcast.episodes[bestMatchIndex];

    if (!matchedEpisode.enclosure?.url) {
      throw new Error('Matched episode has no audio URL');
    }

    log.info("Matched episode by title", {
      searchTitle: episodeTitle,
      matchedTitle: matchedEpisode.title,
      score: results[0].score,
      audioUrl: matchedEpisode.enclosure.url,
      alternativeMatches: results.slice(1, 3).map(r => ({
        title: r.target,
        score: r.score
      })),
    });

    return matchedEpisode.enclosure.url;
  }

  /**
   * Downloads audio from direct URL to temp file, uploads to bucket, and cleans up
   * Secure implementation using spawn to prevent command injection
   * @param audioUrl - Direct URL to audio file
   * @param bookmarkId - Bookmark ID for unique bucket key
   * @returns Bucket key for uploaded audio
   * @throws Error if download or upload fails
   */
  private async downloadAudioFromUrl(
    audioUrl: string,
    bookmarkId: number
  ): Promise<string> {
    const tempPath = `/tmp/podcast-${bookmarkId}.mp3`;
    const bucketKey = `audio-${bookmarkId}-podcast.mp3`;

    // Validate URL format and protocol
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(audioUrl);
    } catch {
      throw new Error(`Invalid audio URL format: ${audioUrl}`);
    }

    // Only allow HTTP/HTTPS to prevent file:// or other protocol exploits
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only HTTP(S) allowed.`);
    }

    log.info("Downloading podcast audio", {
      audioUrl,
      bookmarkId,
      tempPath,
      bucketKey,
    });

    try {
      // Download with spawn (avoids shell injection)
      await this.downloadWithCurl(audioUrl, tempPath);

      // Verify file was downloaded
      if (!fs.existsSync(tempPath)) {
        throw new Error('Audio file not downloaded');
      }

      const fileSize = fs.statSync(tempPath).size;

      // Validate file size
      if (fileSize === 0) {
        fs.unlinkSync(tempPath);
        throw new Error('Downloaded file is empty');
      }

      if (fileSize > MAX_FILE_SIZE) {
        fs.unlinkSync(tempPath);
        throw new Error(
          `Audio file too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`
        );
      }

      log.info("Audio download completed, uploading to bucket", {
        bookmarkId,
        tempPath,
        fileSize,
        bucketKey,
      });

      // Upload to Encore bucket (file size already validated)
      const audioBuffer = fs.readFileSync(tempPath);
      await audioFilesBucket.upload(bucketKey, audioBuffer, {
        contentType: "audio/mpeg",
      });

      log.info("Audio uploaded to bucket", {
        bookmarkId,
        bucketKey,
        size: fileSize,
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

      log.error(error, "Failed to download and upload podcast audio", {
        audioUrl,
        bookmarkId,
      });
      throw new Error(
        `Failed to download podcast audio: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Downloads file using curl via spawn (secure, no shell injection)
   * @param url - URL to download
   * @param outputPath - Where to save the file
   */
  private downloadWithCurl(url: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use spawn with array arguments (no shell interpretation)
      const curl = spawn('curl', [
        '-L',              // Follow redirects
        '-f',              // Fail on HTTP errors
        '--max-time', String(DOWNLOAD_TIMEOUT / 1000), // Timeout in seconds
        '--max-filesize', String(MAX_FILE_SIZE),        // Max file size
        '-o', outputPath,  // Output file
        url                // URL (passed as separate argument, not interpolated)
      ]);

      let stderr = '';

      curl.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      curl.on('error', (error) => {
        reject(new Error(`curl spawn error: ${error.message}`));
      });

      curl.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`curl exited with code ${code}: ${stderr}`));
        } else {
          if (stderr) {
            log.debug("curl stderr output", { stderr });
          }
          resolve();
        }
      });
    });
  }
}
