import { Service } from "encore.dev/service";

// Import processors to register subscriptions (multi-stage pipeline)
import "./processors/youtube-download.processor"; // Stage 1: YouTube download
import "./processors/podcast-download.processor"; // Stage 1: Podcast download
import "./processors/audio-transcription.processor"; // Stage 2: Deepgram transcription (shared)
import "./processors/summary-generation.processor"; // Stage 3: OpenAI summary (shared)

export default new Service("bookmarks");
