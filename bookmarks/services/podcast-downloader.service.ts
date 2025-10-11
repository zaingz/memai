import { promisify } from "util";
import { exec as execCallback } from "child_process";
import fs from "fs";
import log from "encore.dev/log";
import { audioFilesBucket } from "../storage";
import { parsePodcastUrl, getApplePodcastRss } from "../utils/podcast-url.util";
import parsePodcast from "node-podcast-parser";
import ogs from "open-graph-scraper";
import fuzzysort from "fuzzysort";

const exec = promisify(execCallback);

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
    // Fetch RSS feed
    const response = await fetch(rssFeedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
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

    // Fuzzy match episode title
    const episodeTitles = podcast.episodes.map((ep) => ep.title);
    const results = fuzzysort.go(episodeTitle, episodeTitles);

    if (results.length === 0) {
      throw new Error(`Episode "${episodeTitle}" not found in RSS feed`);
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
    });

    return matchedEpisode.enclosure.url;
  }

  /**
   * Downloads audio from direct URL to temp file, uploads to bucket, and cleans up
   * Mirrors the upload pattern used in YouTubeDownloaderService
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

    log.info("Downloading podcast audio", {
      audioUrl,
      bookmarkId,
      tempPath,
      bucketKey,
    });

    try {
      // Download audio with curl (podcast audio URLs are direct MP3 links)
      const { stdout, stderr } = await exec(
        `curl -L -o "${tempPath}" "${audioUrl}"`
      );

      if (stderr) {
        log.warn("curl stderr output", { stderr });
      }

      // Verify file was downloaded
      if (!fs.existsSync(tempPath)) {
        throw new Error('Audio file not downloaded');
      }

      const fileSize = fs.statSync(tempPath).size;
      log.info("Audio download completed, uploading to bucket", {
        bookmarkId,
        tempPath,
        fileSize,
        bucketKey,
      });

      // Upload to Encore bucket (same pattern as YouTube)
      const audioBuffer = fs.readFileSync(tempPath);
      await audioFilesBucket.upload(bucketKey, audioBuffer, {
        contentType: "audio/mpeg",
      });

      log.info("Audio uploaded to bucket", {
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

      log.error(error, "Failed to download and upload podcast audio", {
        audioUrl,
        bookmarkId,
      });
      throw new Error(
        `Failed to download podcast audio: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
