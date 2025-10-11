// ============================================
// Deepgram API Response Types
// ============================================

export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
  speaker?: number;
}

export interface DeepgramSentence {
  text: string;
  start: number;
  end: number;
}

export interface DeepgramParagraph {
  sentences: DeepgramSentence[];
  num_words: number;
  start: number;
  end: number;
}

export interface DeepgramParagraphs {
  transcript: string;
  paragraphs: DeepgramParagraph[];
}

export interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
  paragraphs?: DeepgramParagraphs;
}

export interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

export interface DeepgramModelInfo {
  name: string;
  version: string;
  arch: string;
}

export interface DeepgramMetadata {
  request_id: string;
  sha256?: string;
  created: string;
  duration: number;
  channels: number;
  models?: string[];
  model_info?: Record<string, DeepgramModelInfo>;
}

// ============================================
// Audio Intelligence Types
// ============================================

export interface DeepgramSentiment {
  segments: Array<{
    text: string;
    start_word: number;
    end_word: number;
    sentiment: "positive" | "negative" | "neutral";
    sentiment_score: number;
  }>;
  average: {
    sentiment: "positive" | "negative" | "neutral";
    sentiment_score: number;
  };
}

export interface DeepgramIntent {
  segments: Array<{
    text: string;
    start_word: number;
    end_word: number;
    intents: Array<{
      intent: string;
      confidence_score: number;
    }>;
  }>;
}

export interface DeepgramTopic {
  segments: Array<{
    text: string;
    start_word: number;
    end_word: number;
    topics: Array<{
      topic: string;
      confidence_score: number;
    }>;
  }>;
}

export interface DeepgramSummary {
  result: "success" | "failure";
  short: string;
}

export interface DeepgramResponse {
  metadata: DeepgramMetadata;
  results: {
    channels: DeepgramChannel[];
    sentiments?: DeepgramSentiment; // Note: Deepgram uses "sentiments" (plural)
    intents?: DeepgramIntent;
    topics?: DeepgramTopic;
    summary?: DeepgramSummary;
  };
}
