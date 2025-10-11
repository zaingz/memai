import { Topic } from "encore.dev/pubsub";
import { AudioTranscriptionEvent } from "../types";

/**
 * Stage 2: Audio Transcription Topic
 * Published after audio download completes
 * Triggers Deepgram transcription
 */
export const audioTranscriptionTopic = new Topic<AudioTranscriptionEvent>(
  "audio-transcription",
  {
    deliveryGuarantee: "at-least-once",
  }
);
