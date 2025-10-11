// ============================================
// Multi-Stage Pipeline Event Types
// ============================================

/**
 * Stage 1: YouTube Download Event
 * Triggered when a YouTube bookmark is created
 * Triggers audio download from YouTube
 */
export interface YouTubeDownloadEvent {
  bookmarkId: number;
  url: string;
  title?: string;
}

/**
 * Stage 2: Audio Transcription Event
 * Triggered after audio download completes
 * Triggers Deepgram transcription
 */
export interface AudioTranscriptionEvent {
  bookmarkId: number;
  audioBucketKey: string; // Key in the audioFilesBucket
  videoId: string;
}

/**
 * Stage 3: Summary Generation Event
 * Triggered after transcription completes
 * Triggers OpenAI summary generation
 */
export interface SummaryGenerationEvent {
  bookmarkId: number;
  transcript: string;
}
