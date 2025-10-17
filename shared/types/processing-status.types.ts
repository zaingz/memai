/**
 * Unified processing status for all async operations
 * Used by transcriptions, web content extraction, and daily digests
 */
export enum ProcessingStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}
