import { promisify } from "util";
import { exec as execCallback } from "child_process";
import fs from "fs";
import log from "encore.dev/log";
import { YOUTUBE_CONFIG } from "../config/transcription.config";
import { buildYouTubeUrl } from "../utils/youtube-url.util";
import { audioFilesBucket } from "../storage";

const exec = promisify(execCallback);

/**
 * Service for downloading YouTube audio and uploading to Encore bucket
 */
export class YouTubeDownloaderService {
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
        `yt-dlp -x --audio-format ${YOUTUBE_CONFIG.audioFormat} --audio-quality ${YOUTUBE_CONFIG.audioQuality} -o "${tempPath}" "${youtubeUrl}"`
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
