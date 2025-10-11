import { Topic } from "encore.dev/pubsub";
import { YouTubeDownloadEvent } from "../types";

/**
 * Stage 1: YouTube Download Topic
 * Published when a YouTube bookmark is created
 * Triggers audio download from YouTube
 */
export const youtubeDownloadTopic = new Topic<YouTubeDownloadEvent>(
  "youtube-download",
  {
    deliveryGuarantee: "at-least-once",
  }
);
