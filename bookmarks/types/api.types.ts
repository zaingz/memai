import { Query } from "encore.dev/api";
import { Bookmark, BookmarkSource, Transcription, TranscriptionStatus } from "./domain.types";

// ============================================
// Bookmark API Types
// ============================================

// Request interface for creating a bookmark
export interface CreateBookmarkRequest {
  url: string;
  title?: string;
  source?: BookmarkSource; // Optional - defaults to 'web', triggers auto-classification
  client_time: Date;
  metadata?: Record<string, any>;
}

// Response interface for bookmark operations
export interface BookmarkResponse {
  bookmark: Bookmark;
}

// Request interface for updating a bookmark
export interface UpdateBookmarkRequest {
  id: number;
  url?: string;
  title?: string;
  source?: BookmarkSource;
  metadata?: Record<string, any>;
}

// Request interface for getting a bookmark by ID
export interface GetBookmarkRequest {
  id: number;
}

// Request interface for listing bookmarks with pagination
export interface ListBookmarksRequest {
  limit?: Query<number>;
  offset?: Query<number>;
  source?: Query<BookmarkSource>;
}

// Response interface for listing bookmarks
export interface ListBookmarksResponse {
  bookmarks: Bookmark[];
  total: number;
}

// Request interface for deleting a bookmark
export interface DeleteBookmarkRequest {
  id: number;
}

// Response interface for delete operation
export interface DeleteBookmarkResponse {
  success: boolean;
}

// Request interface for getting bookmark details with enriched data
export interface GetBookmarkDetailsRequest {
  id: number;
}

// Client-facing transcription view (subset of full Transcription domain type)
// Excludes internal fields like deepgram_response, processing timestamps, and database IDs
export interface TranscriptionDetails {
  // Content
  transcript: string | null;
  deepgram_summary: string | null;
  summary: string | null;

  // Sentiment analysis
  sentiment: "positive" | "negative" | "neutral" | null;
  sentiment_score: number | null;

  // Metadata
  duration: number | null; // Duration in seconds
  confidence: number | null; // Confidence score 0-1
  status: TranscriptionStatus; // Processing status
  error_message: string | null; // Error if failed
  created_at: Date; // When transcription started
  updated_at: Date; // When last updated
}

// Response interface for bookmark details (includes all enriched data)
export interface BookmarkDetailsResponse {
  bookmark: Bookmark;
  transcription: TranscriptionDetails | null;
  // Future enrichment types can be added here:
  // webContent?: WebContent | null;
  // codeAnalysis?: CodeAnalysis | null;
  // threadSummary?: ThreadSummary | null;
}
