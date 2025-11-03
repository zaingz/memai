import { DeepgramResponse } from "../types";

/**
 * Extracted transcription data from Deepgram response
 */
export interface ExtractedTranscriptionData {
  transcript: string;
  confidence: number;
  duration: number;
  sentiment: "positive" | "negative" | "neutral" | null;
  sentimentScore: number | null;
  deepgramSummary: string | null;
}

/**
 * Extracts transcription and audio intelligence data from Deepgram response
 * @param response - Deepgram API response
 * @returns Extracted data in a structured format
 * @throws Error if no transcript is found
 */
export function extractDeepgramData(
  response: DeepgramResponse
): ExtractedTranscriptionData {
  // Extract transcript
  const transcript =
    response.results.channels[0]?.alternatives[0]?.transcript || "";

  if (!transcript) {
    throw new Error("No transcript returned from Deepgram");
  }

  // Extract confidence and duration
  const confidence =
    response.results.channels[0]?.alternatives[0]?.confidence || 0;
  const duration = response.metadata.duration;

  // Extract audio intelligence data
  const sentiment = response.results.sentiments?.average?.sentiment || null;
  const sentimentScore =
    response.results.sentiments?.average?.sentiment_score || null;
  const deepgramSummary = response.results.summary?.short || null;

  return {
    transcript,
    confidence,
    duration,
    sentiment,
    sentimentScore,
    deepgramSummary,
  };
}
