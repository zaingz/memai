-- Add transcription method tracking column
-- This allows us to track which method was used (Gemini vs Deepgram) for analytics and cost optimization

ALTER TABLE transcriptions
  ADD COLUMN transcription_method VARCHAR(20) CHECK (
    transcription_method IN ('gemini', 'deepgram')
  );

-- Add index for querying by method (useful for analytics)
CREATE INDEX idx_transcriptions_method ON transcriptions(transcription_method);

-- Add index for time-series analytics (method usage over time)
CREATE INDEX idx_transcriptions_method_created ON transcriptions(transcription_method, created_at DESC);

-- Update comment for documentation
COMMENT ON COLUMN transcriptions.transcription_method IS 'Method used for transcription: gemini (direct YouTube URL) or deepgram (audio download)';
