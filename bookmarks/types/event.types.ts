// ============================================
// Multi-Stage Pipeline Event Types
// ============================================

/**
 * Bookmark Created Event
 * Published when any bookmark is created
 * Triggers classification and appropriate processing pipelines
 */
export interface BookmarkCreatedEvent {
  bookmarkId: number;
  url: string;
  source: string; // Current source (may be 'web' if unknown)
  title?: string;
}

/**
 * Bookmark Source Classified Event
 * Published after URL classification completes
 * Triggers source-specific processing (audio download for YouTube/Podcast)
 */
export interface BookmarkSourceClassifiedEvent {
  bookmarkId: number;
  source: string; // Classified source
  url: string;
  title?: string;
}

/**
 * Audio Downloaded Event
 * Published after audio download completes (YouTube, Podcast, or future sources)
 * Triggers audio transcription
 */
export interface AudioDownloadedEvent {
  bookmarkId: number;
  audioBucketKey: string;
  source: string; // Source type for tracking
  metadata?: {
    videoId?: string; // For YouTube
    episodeUrl?: string; // For Podcast
    platform?: string; // For platform-specific tracking
  };
}

/**
 * Audio Transcribed Event
 * Published after Deepgram transcription completes
 * Triggers summary generation
 */
export interface AudioTranscribedEvent {
  bookmarkId: number;
  transcript: string;
  source: string; // Source type for prompt selection
}

/**
 * Stage 3: Summary Generation Event
 * Triggered after transcription completes
 * Triggers OpenAI summary generation
 */
export interface SummaryGenerationEvent {
  bookmarkId: number;
  transcript: string;
  source: string; // Source type for prompt selection
}
