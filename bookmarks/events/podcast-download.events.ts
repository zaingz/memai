import { Topic } from "encore.dev/pubsub";

/**
 * Event published when a podcast bookmark is created
 * Triggers Stage 1: Podcast audio download and upload to bucket
 */
export interface PodcastDownloadEvent {
  bookmarkId: number;
  url: string; // Podcast episode or RSS feed URL
  title?: string; // Optional title (not currently used)
}

/**
 * Topic for podcast download events
 * Separate from YouTube download topic for distinct processing paths
 */
export const podcastDownloadTopic = new Topic<PodcastDownloadEvent>(
  "podcast-download",
  {
    deliveryGuarantee: "at-least-once",
  }
);
