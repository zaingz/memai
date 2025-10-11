import { Bucket } from "encore.dev/storage/objects";

/**
 * Audio Files Bucket
 * Temporary storage for YouTube audio files during transcription pipeline
 * Files are automatically cleaned up after Stage 2 (transcription) completes
 */
export const audioFilesBucket = new Bucket("audio-files", {
  versioned: false,
});
