import os from "os";
import path from "path";

// ============================================
// Deepgram Configuration
// ============================================

export const DEEPGRAM_CONFIG = {
  model: "nova-3" as const,
  smartFormat: true,
  paragraphs: true,
  punctuate: true,
  diarize: true,
  sentiment: true,
  summarize: "v2" as const,
  intents: true,
  topics: true,
  language: "en" as const,
} as const;

// ============================================
// OpenAI Configuration
// ============================================

export const OPENAI_CONFIG = {
  model: "gpt-4.1-mini" as const,
  temperature: 0.7,
  maxOutputTokens: 500,
  instructions:
    "You are a helpful assistant that creates concise, informative summaries of video transcripts. Focus on the main points and key takeaways.",
} as const;

// ============================================
// YouTube Downloader Configuration
// ============================================

export const YOUTUBE_CONFIG = {
  audioFormat: "mp3" as const,
  audioQuality: "0" as const, // Best quality
  getTempPath: (videoId: string) => path.join(os.tmpdir(), `${videoId}.mp3`),
} as const;

// ============================================
// URL Patterns
// ============================================

export const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/,
  /youtube\.com\/embed\/([^&\s?]+)/,
  /youtube\.com\/v\/([^&\s?]+)/,
] as const;

// ============================================
// Gemini Configuration
// ============================================

export const GEMINI_CONFIG = {
  model: "gemini-1.5-flash-latest" as const, // Fast, cost-effective model with API key support
  maxVideoLength: 7200, // 2 hours max (Gemini limit)
  timeout: 120000, // 2 minutes timeout
  retries: 2, // Retry twice on failure
} as const;
