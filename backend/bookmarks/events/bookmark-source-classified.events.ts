import { Topic } from "encore.dev/pubsub";
import { BookmarkSourceClassifiedEvent } from "../types";

/**
 * Bookmark Source Classified Topic
 * Published after classification processor identifies bookmark source
 * Triggers source-specific downstream processing (e.g., audio download for YouTube/Podcast)
 */
export const bookmarkSourceClassifiedTopic = new Topic<BookmarkSourceClassifiedEvent>(
  "bookmark-source-classified",
  {
    deliveryGuarantee: "at-least-once",
  }
);
