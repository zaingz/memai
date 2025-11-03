export type BookmarkSource =
  | "youtube"
  | "podcast"
  | "reddit"
  | "twitter"
  | "linkedin"
  | "blog"
  | "web"
  | "other";

export interface LinkPreviewMetadata {
  url: string;
  title?: string | null;
  description?: string | null;
  siteName?: string | null;
  mediaType?: string | null;
  favicon?: string | null;
  thumbnailUrl?: string | null;
  accentColor?: string | null;
  publishedTime?: string | null;
  fetchedAt: string;
}

export interface Bookmark {
  id: number;
  user_id: string;
  url: string;
  title: string | null;
  source: BookmarkSource;
  client_time: string;
  created_at: string;
  updated_at: string;
  metadata: {
    linkPreview?: LinkPreviewMetadata;
    [key: string]: any;
  } | null;
}

export interface ListBookmarksResponse {
  bookmarks: Bookmark[];
  total: number;
}

export interface TranscriptionDetails {
  transcript: string | null;
  deepgram_summary: string | null;
  summary: string | null;
  sentiment: "positive" | "negative" | "neutral" | null;
  sentiment_score: number | null;
  duration: number | null;
  confidence: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebContent {
  id: number;
  bookmark_id: number;
  raw_markdown: string | null;
  raw_html: string | null;
  page_title: string | null;
  page_description: string | null;
  language: string | null;
  word_count: number | null;
  char_count: number | null;
  estimated_reading_minutes: number | null;
  summary: string | null;
  metadata: Record<string, any> | null;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookmarkDetailsResponse {
  bookmark: Bookmark;
  transcription: TranscriptionDetails | null;
  webContent: WebContent | null;
}

// Daily Digest Types
export type DigestStatus = "pending" | "processing" | "completed" | "failed";

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

export interface ProcessingMetadata {
  tokenCount?: number;
  modelUsed?: string;
  processingDurationMs?: number;
  summarizationStrategy?: string;
  errorDetails?: string;
}

export interface DailyDigest {
  id: number;
  digest_date: string;
  user_id: string | null;
  status: DigestStatus;
  error_message: string | null;
  bookmark_count: number;
  sources_breakdown: SourcesBreakdown | null;
  date_range_start: string | null;
  date_range_end: string | null;
  digest_content: string | null;
  total_duration: number | null;
  processing_metadata: ProcessingMetadata | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateDailyDigestResponse {
  digest: DailyDigest;
  message: string;
}

export interface GetDailyDigestResponse {
  digest: DailyDigest | null;
}

export interface ListDailyDigestsResponse {
  digests: DailyDigest[];
  total: number;
}
