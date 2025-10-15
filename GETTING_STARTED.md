# Getting Started with MemAI Backend

Complete guide to set up, run, and use the MemAI backend system.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation & Setup](#installation--setup)
3. [Starting the Development Server](#starting-the-development-server)
4. [User Registration & Authentication](#user-registration--authentication)
5. [Creating Bookmarks](#creating-bookmarks)
6. [Daily Digest System](#daily-digest-system)
7. [Testing Workflows](#testing-workflows)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18+ recommended
- **Encore CLI**: Latest version
- **PostgreSQL**: Managed by Encore automatically
- **Supabase Account**: For production authentication
- **API Keys**:
  - Deepgram API Key (for audio transcription)
  - OpenAI API Key (for AI summaries)
  - FireCrawl API Key (for web content extraction)
  - Supabase JWT Secret (for authentication)

### Installation

```bash
# Install Encore CLI
brew install encoredev/tap/encore

# Clone the repository (if not already done)
cd /Users/zainzafar/workspace/memai-backend

# Install dependencies
npm install
```

---

## Installation & Setup

### 1. Configure Secrets

Encore uses secrets for sensitive configuration. Set them up locally:

```bash
# Deepgram API Key (for audio transcription)
encore secret set --type local DeepgramAPIKey

# OpenAI API Key (for AI summaries)
encore secret set --type local OpenAIAPIKey

# FireCrawl API Key (for web content extraction)
encore secret set --type local FirecrawlAPIKey

# Supabase JWT Secret (for authentication)
encore secret set --type local SupabaseJWTSecret
```

**How to get these keys:**

- **Deepgram**: Sign up at https://deepgram.com → Get API key from dashboard
- **OpenAI**: Sign up at https://platform.openai.com → Create API key
- **FireCrawl**: Sign up at https://firecrawl.dev → Get API key
- **Supabase JWT Secret**: From your Supabase project → Settings → API → JWT Secret

### 2. Verify Setup

```bash
# Check secrets are configured
encore secret list --type local

# Should show:
# DeepgramAPIKey
# OpenAIAPIKey
# FirecrawlAPIKey
# SupabaseJWTSecret
```

---

## Starting the Development Server

### Start the Server

```bash
# Start Encore development server
encore run

# Server will start at:
# API: http://127.0.0.1:4000
# Dashboard: http://127.0.0.1:9400
```

**What happens on startup:**
1. ✅ Encore builds the application graph
2. ✅ PostgreSQL database cluster created automatically
3. ✅ Database migrations applied
4. ✅ PubSub daemon started
5. ✅ Object Storage server started
6. ✅ Application secrets loaded
7. ✅ API endpoints registered

### Verify Server is Running

```bash
# Check health
curl http://127.0.0.1:4000/

# View API documentation
open http://127.0.0.1:9400
```

---

## User Registration & Authentication

### Architecture Overview

**Authentication Flow:**
```
Supabase Auth → User Signs Up → Webhook Triggers → MemAI Backend
                                                          ↓
                                      User record synced to local DB
                                                          ↓
                                      JWT token validates future requests
```

### Production Flow (with Supabase)

#### 1. Configure Supabase Webhook

In your Supabase project, set up a webhook to notify MemAI when users register:

**Supabase Dashboard:**
```
Database → Webhooks → Create Webhook
Name: user-created-webhook
Table: auth.users
Events: INSERT
HTTP Request:
  Method: POST
  URL: https://your-api-domain.com/users/webhook/created
  Headers:
    Content-Type: application/json
```

#### 2. User Signs Up (via Supabase)

```bash
# User registers via Supabase Auth
# This is typically done through your frontend app
curl -X POST 'https://your-project.supabase.co/auth/v1/signup' \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure-password"
  }'
```

**Response includes:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  }
}
```

#### 3. Webhook Syncs User to MemAI

Supabase automatically calls your webhook endpoint:

```json
POST /users/webhook/created
{
  "type": "INSERT",
  "table": "users",
  "record": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "created_at": "2025-10-15T00:00:00Z"
  }
}
```

**MemAI Backend:**
- ✅ Receives webhook
- ✅ Creates user record in local database
- ✅ Returns success

#### 4. Use JWT Token for API Requests

All subsequent API requests use the JWT token:

```bash
# Example: Create a bookmark
curl -X POST http://127.0.0.1:4000/bookmarks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "source": "blog",
    "client_time": "2025-10-15T00:00:00Z"
  }'
```

---

### Development/Testing Flow (without Supabase)

For local testing, use the **test endpoints** that bypass authentication:

#### Create Test User Manually

```bash
# 1. Manually insert a test user into the database
psql "$(encore db conn-uri bookmarks)" -c "
INSERT INTO users (id, email, name, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@example.com',
  'Test User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
"

# 2. Verify user was created
psql "$(encore db conn-uri bookmarks)" -c "SELECT id, email, name FROM users;"
```

#### Use Test Endpoints (No Auth Required)

```bash
# Test endpoint for bookmarks (no JWT needed)
curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtu.be/VIDEO_ID",
    "source": "youtube",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## Creating Bookmarks

### Production (Authenticated) Endpoint

```bash
# Required: Valid JWT token from Supabase
curl -X POST http://127.0.0.1:4000/bookmarks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "source": "blog",
    "title": "Optional title",
    "client_time": "2025-10-15T08:00:00Z"
  }'
```

**Response:**
```json
{
  "bookmark": {
    "id": 1,
    "url": "https://example.com/article",
    "source": "blog",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-10-15T08:00:00Z"
  }
}
```

### Test Endpoint (No Authentication)

```bash
# For local development/testing only
curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtu.be/NQEOMgdzBI4",
    "source": "youtube"
  }'
```

### Supported Sources

- `youtube` - YouTube videos (audio extracted and transcribed)
- `podcast` - Podcast episodes (audio downloaded and transcribed)
- `blog` - Blog posts (content extracted via FireCrawl)
- `article` - News articles (content extracted)
- `reddit` - Reddit posts (content extracted)
- `twitter` - Tweets (content extracted)
- `web` - Generic web pages (auto-classified)

### Processing Pipeline

**What happens after creating a bookmark:**

```
1. Bookmark Created
   ↓
2. bookmark-created event published
   ↓
3. Classification Processor
   ↓ (if source known, skip to step 5)
4. Source Detection (if source="web")
   ↓
5. bookmark-source-classified event published
   ↓
   ├─→ Audio Content (youtube/podcast)
   │   ↓
   │   Audio Download → Deepgram Transcription → OpenAI Summary
   │
   └─→ Text Content (blog/article/etc)
       ↓
       FireCrawl Extraction → Content Classification → OpenAI Summary
```

### Check Processing Status

```bash
# Get bookmark details with processing status
curl -X GET "http://127.0.0.1:4000/bookmarks/1/details" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response includes:**
```json
{
  "bookmark": { ... },
  "transcription": {
    "status": "completed",
    "transcript": "Full transcript...",
    "summary": "AI-generated summary...",
    "sentiment": "positive",
    "duration": 725.66
  }
}
```

---

## Daily Digest System

### How Daily Digests Work

**Schedule:**
- Cron job runs at **9 PM GMT daily**
- Generates digest for **yesterday's bookmarks**
- Processes **all users** automatically

**Content:**
- Unified summary of all bookmarks from the previous day
- Includes both audio (YouTube/Podcast) and text (Blog/Article) content
- AI-powered insights, themes, and key takeaways
- Grouped by topics with actionable signals

### Manual Digest Generation

#### Production Endpoint (Authenticated)

```bash
# Generate digest for a specific date
curl -X POST http://127.0.0.1:4000/digests/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-10-14"
  }'
```

#### Test Endpoint (No Authentication)

```bash
# For local development/testing
curl -X POST http://127.0.0.1:4000/test/digests/generate \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-10-14",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:**
```json
{
  "digest": {
    "id": 1,
    "digest_date": "2025-10-14",
    "bookmark_count": 4,
    "status": "completed",
    "digest_content": "### Item 1\n...",
    "sources_breakdown": {
      "youtube": 2,
      "podcast": 1,
      "blog": 1
    }
  },
  "message": "Daily digest generated successfully"
}
```

### Get Existing Digest

```bash
# Get digest for a specific date
curl -X GET "http://127.0.0.1:4000/digests/2025-10-14" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### List All Digests

```bash
# List user's digests with pagination
curl -X GET "http://127.0.0.1:4000/digests?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "digests": [
    {
      "id": 1,
      "digest_date": "2025-10-14",
      "bookmark_count": 4,
      "status": "completed",
      "created_at": "2025-10-15T09:00:00Z"
    }
  ],
  "total": 1
}
```

---

## Testing Workflows

### Complete End-to-End Test

#### 1. Create Test User

```bash
psql "$(encore db conn-uri bookmarks)" -c "
INSERT INTO users (id, email, name)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@example.com',
  'Test User'
)
ON CONFLICT (id) DO NOTHING;
"
```

#### 2. Create Test Bookmarks

```bash
# YouTube video
curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtu.be/VIDEO_ID",
    "source": "youtube"
  }'

# Blog post
curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "source": "blog"
  }'

# Podcast episode
curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://podcasts.apple.com/podcast/episode",
    "source": "podcast"
  }'
```

#### 3. Monitor Processing

```bash
# Check database for processing status
psql "$(encore db conn-uri bookmarks)" -c "
SELECT
  b.id,
  b.source,
  SUBSTRING(b.url, 1, 50) as url,
  t.status as audio_status,
  wc.status as web_status
FROM bookmarks b
LEFT JOIN transcriptions t ON b.id = t.bookmark_id
LEFT JOIN web_contents wc ON b.id = wc.bookmark_id
ORDER BY b.id DESC
LIMIT 5;
"
```

#### 4. Generate Daily Digest

```bash
# Wait for content processing to complete (usually 30-60 seconds)
sleep 60

# Generate digest
curl -X POST http://127.0.0.1:4000/test/digests/generate \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-10-14"
  }'
```

#### 5. View Digest

```bash
# View in database
psql "$(encore db conn-uri bookmarks)" -c "
SELECT
  id,
  digest_date,
  bookmark_count,
  status,
  LENGTH(digest_content) as content_length,
  LEFT(digest_content, 200) || '...' as preview
FROM daily_digests
ORDER BY created_at DESC
LIMIT 1;
"
```

---

## Troubleshooting

### Common Issues

#### 1. Server Won't Start

```bash
# Restart Encore daemon
encore daemon restart

# Check for port conflicts
lsof -i :4000
lsof -i :9400

# Clear cache and restart
rm -rf .encore
encore run
```

#### 2. Secrets Not Loading

```bash
# Verify secrets are set
encore secret list --type local

# Re-set missing secrets
encore secret set --type local SecretName

# Check .secrets.local.cue file exists
cat .secrets.local.cue
```

#### 3. Database Connection Issues

```bash
# Get database connection string
encore db conn-uri bookmarks

# Check database status
psql "$(encore db conn-uri bookmarks)" -c "\conninfo"

# Reset database (CAUTION: deletes all data)
encore db reset bookmarks
```

#### 4. Authentication Failures

**Error: "Authentication required"**
```bash
# Verify JWT token is valid
# Decode token at https://jwt.io

# Check SupabaseJWTSecret matches your Supabase project
encore secret set --type local SupabaseJWTSecret

# For testing, use test endpoints instead
curl -X POST http://127.0.0.1:4000/test/bookmarks ...
```

#### 5. Processing Pipeline Stuck

```bash
# Check for failed jobs
psql "$(encore db conn-uri bookmarks)" -c "
SELECT
  id,
  source,
  t.status as transcription_status,
  t.error_message as transcription_error,
  wc.status as web_content_status,
  wc.error_message as web_content_error
FROM bookmarks b
LEFT JOIN transcriptions t ON b.id = t.bookmark_id
LEFT JOIN web_contents wc ON b.id = wc.bookmark_id
WHERE t.status = 'failed' OR wc.status = 'failed';
"

# Check server logs
# Look for ERROR messages in the Encore output

# Restart processing for a specific bookmark
# (Re-publish the event manually if needed)
```

#### 6. API Keys Invalid

**Symptoms:**
- Deepgram errors: "Invalid API key"
- OpenAI errors: "Authentication failed"
- FireCrawl errors: "Unauthorized"

**Fix:**
```bash
# Verify each API key
encore secret set --type local DeepgramAPIKey
encore secret set --type local OpenAIAPIKey
encore secret set --type local FirecrawlAPIKey

# Restart server to reload secrets
# Stop (Ctrl+C) and restart: encore run
```

---

## Multi-Database Architecture

**IMPORTANT**: MemAI uses **TWO separate databases**:

1. **`users` database** - Managed by the Users service
2. **`bookmarks` database** - Managed by the Bookmarks service

### How to Access Each Database

```bash
# List all databases
encore db list

# Access Users database
psql "$(encore db conn-uri users)"
encore db shell users

# Access Bookmarks database
psql "$(encore db conn-uri bookmarks)"
encore db shell bookmarks
```

**Why separate databases?**
- Service isolation and independence
- Clear ownership boundaries
- Independent scaling
- Easier maintenance and migrations

---

## Database Schema Reference

### Users Database

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Bookmarks Database

#### Bookmarks Table

```sql
CREATE TABLE bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  url TEXT NOT NULL,
  title TEXT,
  source bookmark_source NOT NULL,
  client_time TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Transcriptions Table (Audio Content)

```sql
CREATE TABLE transcriptions (
  id BIGSERIAL PRIMARY KEY,
  bookmark_id BIGINT NOT NULL UNIQUE REFERENCES bookmarks(id),
  transcript TEXT,
  summary TEXT,
  deepgram_summary TEXT,
  sentiment sentiment_type,
  sentiment_score DOUBLE PRECISION,
  duration NUMERIC,
  status transcription_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Web Contents Table (Text Content)

```sql
CREATE TABLE web_contents (
  id BIGSERIAL PRIMARY KEY,
  bookmark_id BIGINT NOT NULL UNIQUE REFERENCES bookmarks(id),
  raw_markdown TEXT,
  raw_html TEXT,
  page_title TEXT,
  summary TEXT,
  word_count INTEGER,
  estimated_reading_minutes INTEGER,
  status content_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Daily Digests Table

```sql
CREATE TABLE daily_digests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  digest_date DATE NOT NULL,
  bookmark_count INTEGER NOT NULL,
  digest_content TEXT,
  sources_breakdown JSONB,
  status digest_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, digest_date)
);
```

---

## Useful Commands

### Database Queries

```bash
# Check all bookmarks
psql "$(encore db conn-uri bookmarks)" -c "
SELECT id, source, LEFT(url, 50), created_at
FROM bookmarks
ORDER BY created_at DESC
LIMIT 10;
"

# Check processing status
psql "$(encore db conn-uri bookmarks)" -c "
SELECT
  'Audio' as type,
  status,
  COUNT(*) as count
FROM transcriptions
GROUP BY status
UNION ALL
SELECT
  'Web' as type,
  status::text,
  COUNT(*) as count
FROM web_contents
GROUP BY status;
"

# Check daily digests
psql "$(encore db conn-uri bookmarks)" -c "
SELECT
  digest_date,
  bookmark_count,
  status,
  LENGTH(digest_content) as content_length
FROM daily_digests
ORDER BY digest_date DESC;
"
```

### API Testing

```bash
# List all endpoints
curl http://127.0.0.1:4000/

# Health check
curl http://127.0.0.1:4000/health

# View API documentation
open http://127.0.0.1:9400
```

---

## Next Steps

1. **Set up Supabase** for production authentication
2. **Configure webhooks** to sync users automatically
3. **Test the complete flow** with real bookmarks
4. **Monitor the daily digest** cron job
5. **Deploy to production** using Encore Cloud

For production deployment:
```bash
# Deploy to Encore Cloud
encore app create
encore deploy
```

---

## Support

- **Encore Documentation**: https://encore.dev/docs
- **Project Issues**: Check logs in Encore dashboard
- **API Reference**: http://127.0.0.1:9400 when server running

Happy building! 🚀
