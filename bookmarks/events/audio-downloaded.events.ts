import { Topic } from "encore.dev/pubsub";
import { AudioDownloadedEvent } from "../types";

/**
 * Audio Downloaded Topic
 * Published after audio download completes (YouTube, Podcast, or other sources)
 * Triggers audio transcription with Deepgram
 */
export const audioDownloadedTopic = new Topic<AudioDownloadedEvent>(
  "audio-downloaded",
  {
    deliveryGuarantee: "at-least-once",
  }
);
