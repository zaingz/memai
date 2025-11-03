-- Create enum for web content processing status
CREATE TYPE content_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Create web_contents table
CREATE TABLE web_contents (
  id BIGSERIAL PRIMARY KEY,
  bookmark_id BIGINT NOT NULL UNIQUE REFERENCES bookmarks(id) ON DELETE CASCADE,

  -- Raw content from FireCrawl
  raw_markdown TEXT,
  raw_html TEXT,

  -- Extracted metadata from FireCrawl
  page_title TEXT,
  page_description TEXT,
  language VARCHAR(10),

  -- Computed metrics (for digest processing)
  word_count INTEGER,
  char_count INTEGER,
  estimated_reading_minutes INTEGER,

  -- AI-generated summary (from OpenAI)
  summary TEXT,

  -- Full FireCrawl response (JSONB for flexibility)
  metadata JSONB,

  -- Processing lifecycle tracking
  status content_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,

  -- Standard timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_web_contents_bookmark_id ON web_contents(bookmark_id);
CREATE INDEX idx_web_contents_status ON web_contents(status);
CREATE INDEX idx_web_contents_created_at ON web_contents(created_at DESC);

-- Trigger for automatic updated_at
CREATE TRIGGER update_web_contents_updated_at
  BEFORE UPDATE ON web_contents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Documentation
COMMENT ON TABLE web_contents IS 'Stores extracted web content (articles, blogs, social posts) fetched via FireCrawl API';
COMMENT ON COLUMN web_contents.raw_markdown IS 'Clean markdown content from FireCrawl';
COMMENT ON COLUMN web_contents.raw_html IS 'Raw HTML from FireCrawl (for future use)';
COMMENT ON COLUMN web_contents.metadata IS 'Full FireCrawl response including author, publish date, og tags, etc.';
COMMENT ON COLUMN web_contents.word_count IS 'Word count for content length classification (short/article/long-form)';
COMMENT ON COLUMN web_contents.estimated_reading_minutes IS 'Calculated at 200 WPM for user display';
