import { GoogleGenAI } from "@google/genai";
import log from "encore.dev/log";
import { GEMINI_CONFIG } from "../config/transcription.config";
import { GeminiTranscriptResponse, GeminiErrorType } from "../types/gemini.types";

/**
 * Gemini Service
 * Handles YouTube video transcription using Google Gemini 2.5 Flash
 *
 * Uses the official @google/genai SDK (v1.25.0+)
 *
 * Benefits over yt-dlp + Deepgram:
 * - No audio download required (direct YouTube URL processing)
 * - Faster: ~30 seconds vs 2-5 minutes
 * - Cheaper: $0.02-0.05 per hour vs $0.10
 * - Simpler: Single API call vs multi-stage pipeline
 *
 * Limitations:
 * - Only works with public YouTube videos
 * - Max 2 hours of video
 * - Free tier: 8 hours of YouTube video per day
 */
export class GeminiService {
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Gemini API key is empty or undefined');
    }

    // Log key info for debugging (first/last 4 chars only)
    const maskedKey = apiKey.length > 8
      ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
      : '***masked***';

    log.info("Initializing Gemini service", {
      apiKeyLength: apiKey.length,
      apiKeyPreview: maskedKey,
      sdkVersion: "@google/genai v1.25.0",
    });

    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Transcribes a YouTube video using Gemini 2.5 Flash
   *
   * @param videoUrl - Full YouTube URL (e.g., https://youtube.com/watch?v=VIDEO_ID)
   * @param videoId - YouTube video ID (for logging)
   * @returns Transcript with metadata or error
   */
  async transcribeYouTubeVideo(
    videoUrl: string,
    videoId: string
  ): Promise<GeminiTranscriptResponse> {
    const startTime = Date.now();

    try {
      log.info("Starting Gemini transcription", {
        videoId,
        videoUrl,
        model: GEMINI_CONFIG.model,
      });

      // Create prompt with explicit instructions
      const prompt = `Please provide a complete, accurate transcript of this YouTube video.

Requirements:
1. Include ALL spoken words verbatim
2. Use proper punctuation and paragraph breaks
3. Do NOT include timestamps or speaker labels
4. Do NOT add commentary or analysis
5. Just provide the raw transcript text

Return ONLY the transcript, nothing else.`;

      // Make API call with timeout
      const result = await Promise.race([
        this.client.models.generateContent({
          model: GEMINI_CONFIG.model,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  fileData: {
                    fileUri: videoUrl,
                    mimeType: "video/*",
                  },
                },
              ],
            },
          ],
        }),
        this.createTimeout(GEMINI_CONFIG.timeout),
      ]);

      // Check if timeout occurred
      if (result === "TIMEOUT") {
        throw new Error(GeminiErrorType.TIMEOUT);
      }

      const transcript = (result.text || "").trim();

      // Validate transcript
      if (!transcript || transcript.length < 10) {
        throw new Error("Empty or invalid transcript received");
      }

      const processingTime = Date.now() - startTime;

      log.info("Gemini transcription successful", {
        videoId,
        transcriptLength: transcript.length,
        processingTime,
        wordsCount: transcript.split(/\s+/).length,
      });

      return {
        transcript,
        confidence: 0.95, // Gemini is highly accurate
        processingTime,
        method: "gemini",
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = this.parseError(error);
      const errorType = this.classifyError(error);

      log.warn("Gemini transcription failed", {
        videoId,
        error: errorMessage,
        errorType,
        processingTime,
      });

      return {
        transcript: "",
        confidence: 0,
        processingTime,
        method: "gemini",
        error: errorMessage,
      };
    }
  }

  /**
   * Creates a timeout promise
   */
  private createTimeout(ms: number): Promise<"TIMEOUT"> {
    return new Promise((resolve) => {
      setTimeout(() => resolve("TIMEOUT"), ms);
    });
  }

  /**
   * Parses error to human-readable message
   */
  private parseError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Classifies error type for analytics
   */
  private classifyError(error: unknown): GeminiErrorType {
    const errorStr = String(error).toLowerCase();

    if (errorStr.includes("private") || errorStr.includes("unavailable")) {
      return GeminiErrorType.PRIVATE_VIDEO;
    }
    if (errorStr.includes("rate limit") || errorStr.includes("quota")) {
      return GeminiErrorType.RATE_LIMIT;
    }
    if (errorStr.includes("timeout")) {
      return GeminiErrorType.TIMEOUT;
    }
    if (errorStr.includes("invalid") || errorStr.includes("url")) {
      return GeminiErrorType.INVALID_URL;
    }
    if (errorStr.includes("too long") || errorStr.includes("duration")) {
      return GeminiErrorType.VIDEO_TOO_LONG;
    }
    if (errorStr.includes("network") || errorStr.includes("connection")) {
      return GeminiErrorType.NETWORK_ERROR;
    }

    return GeminiErrorType.API_ERROR;
  }
}
