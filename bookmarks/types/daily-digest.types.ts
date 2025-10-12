import { BookmarkSource } from "./domain.types";

// ============================================
// Daily Digest Domain Types
// ============================================

// Daily digest processing status
export enum DigestStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

// Breakdown of bookmark counts by source
export interface SourcesBreakdown {
  youtube?: number;
  podcast?: number;
  reddit?: number;
  twitter?: number;
  linkedin?: number;
  blog?: number;
  web?: number;
  other?: number;
}

// Processing metadata for observability
export interface ProcessingMetadata {
  tokenCount?: number;
  modelUsed?: string;
  processingDurationMs?: number;
  summarizationStrategy?: string;
  errorDetails?: string;
}

// Database row interface for daily_digests
export interface DailyDigest {
  id: number;
  digest_date: Date;
  user_id: number | null;
  status: DigestStatus;
  error_message: string | null;

  // Metadata
  bookmark_count: number;
  sources_breakdown: SourcesBreakdown | null;
  date_range_start: Date | null;
  date_range_end: Date | null;

  // Content (populated in Phase 2)
  digest_content: string | null;
  total_duration: number | null;
  processing_metadata: ProcessingMetadata | null;

  // Timestamps
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// API Request/Response Types
// ============================================

// Generate daily digest request
export interface GenerateDailyDigestRequest {
  // Optional date to generate digest for (defaults to yesterday)
  date?: string; // ISO date string (YYYY-MM-DD)
  // Optional user_id for future scoping (not used yet)
  user_id?: number;
}

// Generate daily digest response
export interface GenerateDailyDigestResponse {
  digest: DailyDigest;
  message: string;
}

// Get daily digest request
export interface GetDailyDigestRequest {
  date: string; // ISO date string (YYYY-MM-DD)
  user_id?: number;
}

// Get daily digest response
export interface GetDailyDigestResponse {
  digest: DailyDigest | null;
}

// List daily digests request
export interface ListDailyDigestsRequest {
  limit?: number;
  offset?: number;
  user_id?: number;
}

// List daily digests response
export interface ListDailyDigestsResponse {
  digests: DailyDigest[];
  total: number;
}

// ============================================
// Service Types
// ============================================

// Options for digest generation
export interface DigestGenerationOptions {
  date: Date;
  userId?: number;
  forceRegenerate?: boolean; // If true, regenerate even if exists
}

// Transcription summary data (subset for digest generation)
export interface TranscriptionSummary {
  bookmark_id: number;
  transcript: string | null;
  summary: string | null; // OpenAI summary
  deepgram_summary: string | null;
  source: BookmarkSource;
  duration: number | null;
  sentiment: "positive" | "negative" | "neutral" | null;
  created_at: Date;
}
