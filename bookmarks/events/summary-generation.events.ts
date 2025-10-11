import { Topic } from "encore.dev/pubsub";
import { SummaryGenerationEvent } from "../types";

/**
 * Stage 3: Summary Generation Topic
 * Published after transcription completes
 * Triggers OpenAI summary generation
 */
export const summaryGenerationTopic = new Topic<SummaryGenerationEvent>(
  "summary-generation",
  {
    deliveryGuarantee: "at-least-once",
  }
);
