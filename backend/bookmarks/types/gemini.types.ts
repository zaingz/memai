/**
 * Gemini API Types
 *
 * Type definitions for Google Gemini 2.5 API responses
 */

/**
 * Result from Gemini transcription
 */
export interface GeminiTranscriptResult {
  transcript: string;
  confidence: number; // Gemini is highly accurate, typically 0.95
  processingTime: number; // milliseconds
  method: "gemini";
  error?: never;
}

/**
 * Error result from Gemini transcription
 */
export interface GeminiTranscriptError {
  transcript: "";
  confidence: 0;
  processingTime: number;
  method: "gemini";
  error: string;
}

/**
 * Union type for Gemini transcription results
 */
export type GeminiTranscriptResponse =
  | GeminiTranscriptResult
  | GeminiTranscriptError;

/**
 * Gemini API error types
 */
export enum GeminiErrorType {
  PRIVATE_VIDEO = "PRIVATE_VIDEO", // Video is private/unlisted
  RATE_LIMIT = "RATE_LIMIT", // API rate limit exceeded
  TIMEOUT = "TIMEOUT", // Request timed out
  INVALID_URL = "INVALID_URL", // Invalid YouTube URL
  VIDEO_TOO_LONG = "VIDEO_TOO_LONG", // Video exceeds 2 hour limit
  API_ERROR = "API_ERROR", // General API error
  NETWORK_ERROR = "NETWORK_ERROR", // Network connectivity issue
}
