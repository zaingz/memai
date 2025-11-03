-- Create enum for transcription processing status
CREATE TYPE transcription_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Create transcriptions table
CREATE TABLE transcriptions (
  id BIGSERIAL PRIMARY KEY,
  bookmark_id BIGINT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,

  -- Transcription data
  transcript TEXT,
  summary TEXT,

  -- Raw Deepgram response (stored as JSONB for querying capabilities)
  deepgram_response JSONB,

  -- Metadata from Deepgram
  duration DECIMAL,
  confidence DECIMAL,

  -- Processing status
  status transcription_status NOT NULL DEFAULT 'pending',
  error_message TEXT,

  -- Timestamps
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: one transcription per bookmark
  CONSTRAINT unique_bookmark_transcription UNIQUE(bookmark_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_transcriptions_bookmark_id ON transcriptions(bookmark_id);
CREATE INDEX idx_transcriptions_status ON transcriptions(status);
CREATE INDEX idx_transcriptions_created_at ON transcriptions(created_at DESC);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transcriptions_updated_at
    BEFORE UPDATE ON transcriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE transcriptions IS 'Stores YouTube video transcriptions and summaries generated via Deepgram API';
COMMENT ON COLUMN transcriptions.deepgram_response IS 'Full Deepgram API response including words, paragraphs, timestamps, and confidence scores';
COMMENT ON COLUMN transcriptions.duration IS 'Video duration in seconds';
COMMENT ON COLUMN transcriptions.confidence IS 'Overall transcription confidence score (0-1)';
