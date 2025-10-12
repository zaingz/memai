import { Service } from "encore.dev/service";

// Import processors to register subscriptions (decoupled event-driven pipeline)
import "./processors/bookmark-classification.processor"; // Classify bookmark URL and update source
import "./processors/audio-download.processor"; // Unified audio download (YouTube, Podcast, etc.)
import "./processors/audio-transcription.processor"; // Deepgram transcription (source-agnostic)
import "./processors/summary-generation.processor"; // OpenAI summary (source-aware prompts)

// Import cron jobs to register scheduled tasks
import "./cron/daily-digest.cron"; // Generate daily digest at 9 PM GMT

export default new Service("bookmarks");
