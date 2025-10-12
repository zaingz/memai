import { Topic } from "encore.dev/pubsub";
import { AudioTranscribedEvent } from "../types";

/**
 * Audio Transcribed Topic
 * Published after Deepgram transcription completes
 * Triggers summary generation with OpenAI
 */
export const audioTranscribedTopic = new Topic<AudioTranscribedEvent>(
  "audio-transcribed",
  {
    deliveryGuarantee: "at-least-once",
  }
);
