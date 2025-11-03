import { Topic } from "encore.dev/pubsub";
import { BookmarkCreatedEvent } from "../types";

/**
 * Bookmark Created Topic
 * Published when any bookmark is created (regardless of source)
 * Triggers classification and appropriate downstream processing
 */
export const bookmarkCreatedTopic = new Topic<BookmarkCreatedEvent>(
  "bookmark-created",
  {
    deliveryGuarantee: "at-least-once",
  }
);
