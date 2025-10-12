import { DeepgramResponse } from "./deepgram.types";

// ============================================
// Bookmark Domain Types
// ============================================

// Enum for bookmark sources
export enum BookmarkSource {
  YOUTUBE = "youtube",
  PODCAST = "podcast",
  REDDIT = "reddit",
  TWITTER = "twitter",
  LINKEDIN = "linkedin",
  BLOG = "blog",
  WEB = "web",
  OTHER = "other",
}

// Database row interface for bookmarks
export interface Bookmark {
  id: number;
  user_id: number;
  url: string;
  title: string | null;
  source: BookmarkSource;
  client_time: Date;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Transcription Domain Types
// ============================================

// Transcription processing status
export enum TranscriptionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

// Database row interface for transcriptions
export interface Transcription {
  id: number;
  bookmark_id: number;

  // Transcription data (Stage 2: Deepgram Transcription)
  transcript: string | null;
  deepgram_summary: string | null; // Deepgram generated summary
  sentiment: "positive" | "negative" | "neutral" | null;
  sentiment_score: number | null;
  deepgram_response: DeepgramResponse | null;
  duration: number | null;
  confidence: number | null;

  // Summary data (Stage 3: OpenAI Summary)
  summary: string | null; // OpenAI generated summary

  // Status tracking
  status: TranscriptionStatus;
  error_message: string | null;
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
