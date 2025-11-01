# MemAI Backend

> AI-powered bookmark management system with automatic transcription, summarization, and daily digest generation.

## Project Overview

**MemAI** is a full-stack application that helps users save and process content from various sources (YouTube, podcasts, blogs, articles) with AI-powered transcription and summarization. The backend is built on Encore.ts with a React frontend deployed separately to Vercel.

### Tech Stack

**Backend:**
- **Encore.ts** - TypeScript backend framework with built-in database, Pub/Sub, and object storage
- **PostgreSQL** - Two separate databases (users, bookmarks) for service isolation
- **Deepgram Nova-3** - Audio transcription with Audio Intelligence features
- **OpenAI GPT-4.1-mini** - AI summarization via Responses API
- **Supabase Auth** - User authentication and JWT validation

**Frontend:**
- **React 18 + TypeScript** - Modern React with full type safety
- **Vite** - Fast build tooling
- **TanStack Query** - Server state management
- **Tailwind CSS + shadcn/ui** - Styling and component library
- **Vercel** - Separate deployment (not in Encore builds)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Vercel)                       │
│  React + TanStack Query + Supabase Auth + Encore Client        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS + JWT Auth
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Encore Cloud)                       │
│  ┌──────────────┐              ┌──────────────┐                │
│  │ Users Service│              │Bookmarks Svc │                │
│  │              │              │              │                │
│  │ - Auth       │              │ - CRUD       │                │
│  │ - Webhooks   │              │ - Processing │                │
│  │              │              │ - Digests    │                │
│  └──────────────┘              └──────────────┘                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Multi-Stage Pub/Sub Pipeline                  │  │
│  │                                                          │  │
│  │  Bookmark Created                                        │  │
│  │        ↓                                                 │  │
│  │  Stage 1: Classification (detect source type)           │  │
│  │        ↓                                                 │  │
│  │        ├─→ Audio Sources (YouTube, Podcast)             │  │
│  │        │   ↓                                             │  │
│  │        │   Stage 2: Download audio → Upload to Bucket   │  │
│  │        │   ↓                                             │  │
│  │        │   Stage 3: Deepgram Transcription              │  │
│  │        │   ↓                                             │  │
│  │        │   Stage 4: OpenAI Summary                      │  │
│  │        │                                                 │  │
│  │        └─→ Text Sources (Blog, Article, etc.)           │  │
│  │            ↓                                             │  │
│  │            Stage 2: FireCrawl Extraction                │  │
│  │            ↓                                             │  │
│  │            Stage 3: OpenAI Summary                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │    Bucket    │  │  Cron Jobs   │          │
│  │  (2 DBs)     │  │ (Audio Files)│  │  (Digests)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **Encore CLI** - `brew install encoredev/tap/encore`
- **PostgreSQL** (managed by Encore automatically)
- **API Keys** (see Environment Setup below)

### Installation

```bash
# Install dependencies
npm install

# Set up secrets (Encore will prompt for values)
encore secret set --type local DeepgramAPIKey
encore secret set --type local OpenAIAPIKey
encore secret set --type local FirecrawlAPIKey
encore secret set --type local SupabaseJWTSecret

# Run development server
encore run

# Server starts at:
# API: http://localhost:4000
# Dashboard: http://localhost:9400
```

### Environment Variables

**Backend (Encore Secrets):**
- `DeepgramAPIKey` - Audio transcription ([get key](https://deepgram.com))
- `OpenAIAPIKey` - AI summaries ([get key](https://platform.openai.com))
- `FirecrawlAPIKey` - Web content extraction ([get key](https://firecrawl.dev))
- `SupabaseJWTSecret` - JWT validation (from Supabase project settings)

**Frontend (`frontend/.env.local`):**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:4000  # Local dev
# VITE_API_BASE_URL=https://staging-memai-backend-cno2.encr.app  # Staging
```

---

## Deployment

### Backend Deployment (Encore Cloud)

MemAI uses **two separate git remotes**:
- `origin` - GitHub repository for source control
- `encore` - Encore Cloud for deployment

```bash
# View remotes
git remote -v

# Deploy to Encore Cloud
git push encore main

# View logs
encore logs --env=staging

# Alternative: Use Makefile
make deploy-backend
```

**Important**: Backend deployment happens via the `encore` remote, NOT `origin`. Push to `encore` remote triggers automatic deployment to Encore Cloud.

### Frontend Deployment (Vercel)

Frontend is deployed separately to Vercel:

```bash
cd frontend

# First time setup
vercel

# Production deployment
vercel --prod

# Alternative: Use Makefile
make deploy-frontend  # From project root
```

**Environment Variables for Vercel:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_API_BASE_URL` - Encore backend URL (e.g., `https://staging-memai-backend-cno2.encr.app`)

### Deploy Both

```bash
make deploy-all  # Deploys backend + frontend
```

---

## ⚠️ CORS Configuration: Hard-Won Lessons

This section documents the **extensive CORS troubleshooting journey** that took multiple deployment cycles to resolve. Understanding these issues will save you hours of debugging.

### The Problem

When deploying frontend (Vercel) and backend (Encore Cloud) separately, CORS becomes critical. The frontend needs to make authenticated requests with `credentials: 'include'` to pass JWT tokens, which requires precise CORS configuration.

### The Solution: `encore.app` Configuration

**File: `encore.app`**
```json
{
  "id": "memai-backend-cno2",
  "lang": "typescript",
  "exclude": [
    "frontend"
  ],
  "global_cors": {
    "debug": true,
    "allow_origins_without_credentials": [
      "*"
    ],
    "allow_origins_with_credentials": [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:3000",
      "https://frontend-zaingzs-projects.vercel.app",
      "https://frontend-one-liart-67.vercel.app",
      "https://frontend-*.vercel.app",
      "https://*-zaingzs-projects.vercel.app"
    ]
  }
}
```

### Key CORS Concepts

**1. Two Types of CORS Origins**

- `allow_origins_without_credentials`: For public endpoints, unauthenticated requests
- `allow_origins_with_credentials`: For authenticated requests with cookies/credentials

**Why Both?** Some endpoints may be public (health checks), while others require authentication.

**2. Frontend Must Use `credentials: 'include'`**

```typescript
// frontend/src/lib/encore.ts
const client = new Client(baseUrl, {
  fetcher: (input, init) =>
    fetch(input, {
      ...init,
      credentials: "include", // ⚠️ CRITICAL for CORS with auth
    }),
});
```

Without `credentials: 'include'`, cookies/JWT headers won't be sent in cross-origin requests.

### Common CORS Pitfalls We Encountered

#### 1. **Encore CLI Version Bug (v1.50.4)**

**Problem**: Encore CLI v1.50.4 had a bug where `global_cors` config wasn't properly pushed to deployment.

**Fix**: Upgrade to v1.50.7+
```bash
# Check version
encore version

# Upgrade
brew upgrade encore
```

**Commits**: `16f524f`, `83c9c2a`

#### 2. **Environment Variable Newline Issues**

**Problem**: Setting CORS origins via environment variables with newlines corrupted the `encore.app` file.

**Fix**: Define CORS origins directly in `encore.app` (JSON format), NOT via environment variables.

**Commits**: `1e98b58`, `284be72`

#### 3. **ANSI Color Codes Corrupting encore.app**

**Problem**: ANSI escape codes from terminal output got embedded into `encore.app`, breaking JSON parsing.

**Example of corrupted file:**
```json
{
  "global_cors": {
    "allow_origins_with_credentials": [
      "[38;2;248;248;242mhttps://example.com[0m"  // ❌ ANSI codes
    ]
  }
}
```

**Fix**: Manually clean `encore.app` to remove all ANSI codes. Use a plain text editor, NOT terminal output redirection.

**Commits**: `1e98b58`, `2531af7`

#### 4. **Deployment State Not Updating**

**Problem**: After fixing `encore.app`, deployment still used old CORS config (cached state).

**Fix**: Force fresh deployment by restarting Encore daemon and re-pushing:
```bash
encore daemon restart
git push encore main --force
```

**Commits**: `83c9c2a`, `16f524f`

#### 5. **Frontend Excluded from Encore Builds**

**Problem**: Frontend directory was being included in Encore deployments, causing build issues.

**Fix**: Add `"exclude": ["frontend"]` to `encore.app`

```json
{
  "id": "memai-backend-cno2",
  "exclude": [
    "frontend"  // ⚠️ CRITICAL: Frontend deployed separately to Vercel
  ]
}
```

**Commits**: `41da645`

#### 6. **Forgot to Push to `encore` Remote**

**Problem**: Pushed changes to `origin` (GitHub) but forgot to push to `encore` remote, so deployment didn't pick up changes.

**Fix**: Always push to BOTH remotes:
```bash
git push origin main  # Source control
git push encore main  # Deployment
```

Or use `git push --all`.

### How to Verify CORS is Working

#### Test 1: Preflight Request (OPTIONS)

```bash
curl -X OPTIONS https://staging-memai-backend-cno2.encr.app/bookmarks \
  -H "Origin: https://frontend-zaingzs-projects.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization" \
  -v
```

**Expected Response Headers:**
```
Access-Control-Allow-Origin: https://frontend-zaingzs-projects.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: POST, GET, OPTIONS, ...
Access-Control-Allow-Headers: authorization, content-type, ...
```

#### Test 2: Authenticated Request

```bash
curl -X GET https://staging-memai-backend-cno2.encr.app/users/me \
  -H "Origin: https://frontend-zaingzs-projects.vercel.app" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: your-session-cookie" \
  -v
```

**Expected**: Should return user data, NOT a CORS error.

#### Test 3: Frontend DevTools

Open browser DevTools → Network tab → Make API request from frontend:
- ✅ Status: 200 (or appropriate status)
- ✅ No red CORS errors in console
- ✅ Response headers include `Access-Control-Allow-Origin`

### CORS Troubleshooting Checklist

If you encounter CORS errors:

- [ ] Encore CLI version is v1.50.7 or higher
- [ ] `encore.app` has `global_cors` config (no ANSI codes)
- [ ] Frontend URL is in `allow_origins_with_credentials` list
- [ ] Frontend uses `credentials: 'include'` in fetch config
- [ ] Changes pushed to `encore` remote, not just `origin`
- [ ] Encore daemon restarted after config changes
- [ ] Deployment logs show new CORS config applied
- [ ] Browser cleared cache / used incognito mode for testing

---

## Architecture

### Backend Service Structure

```
bookmarks/
├── encore.service.ts         # Service registration + processor imports
├── api.ts                    # REST API endpoints
├── db.ts                     # Database initialization
├── storage.ts                # Encore Bucket for audio files
├── events/                   # Pub/Sub topic definitions
│   ├── bookmark-created.events.ts
│   ├── bookmark-source-classified.events.ts
│   ├── audio-downloaded.events.ts
│   ├── audio-transcribed.events.ts
│   └── content-extracted.events.ts
├── processors/               # Pub/Sub handlers (event-driven)
│   ├── bookmark-classification.processor.ts
│   ├── audio-download.processor.ts
│   ├── audio-transcription.processor.ts
│   ├── summary-generation.processor.ts
│   ├── content-extraction.processor.ts
│   └── content-summary.processor.ts
├── services/                 # Business logic
│   ├── youtube-downloader.service.ts
│   ├── deepgram.service.ts
│   └── openai.service.ts
├── repositories/             # Database access ONLY
│   ├── bookmark.repository.ts
│   └── transcription.repository.ts
├── types/                    # Organized type definitions
│   ├── domain.types.ts       # Core domain models
│   ├── api.types.ts          # API request/response types
│   ├── event.types.ts        # Pub/Sub event types
│   └── deepgram.types.ts     # External API types
├── config/                   # Centralized configuration
│   └── transcription.config.ts
├── utils/                    # Pure utility functions
│   ├── youtube-url.util.ts
│   └── file-cleanup.util.ts
└── migrations/               # SQL migrations (numbered)
    ├── 1_create_bookmarks.up.sql
    ├── 2_create_transcriptions.up.sql
    └── ...

users/
├── encore.service.ts         # Service registration
├── api.ts                    # User endpoints
├── auth.ts                   # JWT authentication
├── webhooks.ts               # Supabase webhook handlers
├── db.ts                     # Database initialization
├── repositories/
│   └── user.repository.ts
└── migrations/
    └── 1_create_users.up.sql
```

### Multi-Stage Pub/Sub Pipeline

**Design Philosophy**: Fault tolerance through data persistence at each stage.

**Example: YouTube Video Processing**

```
Stage 1: Classification Processor
├─ Input: bookmark-created event
├─ Action: Detect source type (YouTube, Podcast, Blog, etc.)
├─ Persist: Update bookmark.source in DB
└─ Output: bookmark-source-classified event

Stage 2: Audio Download Processor (YouTube/Podcast only)
├─ Input: bookmark-source-classified event (audio sources)
├─ Action: Download audio → Upload to Encore Bucket
├─ Persist: Store bucket key in DB
└─ Output: audio-downloaded event (with bucket key)

Stage 3: Audio Transcription Processor
├─ Input: audio-downloaded event
├─ Action: Download from bucket → Transcribe with Deepgram
├─ Persist: Store transcript + metadata in transcriptions table
├─ Cleanup: Delete audio from bucket
└─ Output: audio-transcribed event

Stage 4: Summary Generation Processor
├─ Input: audio-transcribed event
├─ Action: Generate OpenAI summary
├─ Persist: Store summary in transcriptions table
└─ Output: Processing complete (status = 'completed')
```

**Benefits:**
- ✅ **Fault Isolation**: Each stage can fail independently
- ✅ **Retry Safety**: Can retry any stage without redoing previous stages
- ✅ **Object Storage**: Audio files in Encore Bucket (cloud-ready, not filesystem)
- ✅ **Data Persistence**: Results stored immediately at each stage
- ✅ **Automatic Cleanup**: Audio deleted from bucket after transcription

### Database Schema

**Two Separate Databases:**
- `users` - Managed by Users service
- `bookmarks` - Managed by Bookmarks service

See [migrations/](./bookmarks/migrations/) for complete schema. Key tables:

- `users` - User accounts (UUID, email, name)
- `bookmarks` - Saved content (URL, source, user_id)
- `transcriptions` - Audio transcription data (transcript, summary, sentiment)
- `web_contents` - Text content extraction (markdown, HTML, summary)
- `daily_digests` - AI-generated daily summaries

---

## Development

### Common Commands

```bash
# Start development server
encore run

# Run tests
encore test

# Type checking
npx tsc --noEmit

# Database operations
encore db list                    # List databases
encore db shell bookmarks         # Open psql shell
psql "$(encore db conn-uri bookmarks)" -c "SELECT * FROM bookmarks LIMIT 5;"

# View logs
encore logs --env=local

# Deployment
make deploy-backend              # Deploy to Encore Cloud
make deploy-frontend             # Deploy to Vercel
```

See [Makefile](./Makefile) for more commands.

### Project Structure

**Key Directories:**
- `/bookmarks` - Bookmarks service (main processing logic)
- `/users` - Users service (auth, webhooks)
- `/frontend` - React frontend (deployed separately to Vercel)
- `/test` - Shared test utilities and factories

**Documentation:**
- [CLAUDE.md](./CLAUDE.md) - Detailed development guidelines and patterns
- [llm.txt](./llm.txt) - Encore.ts framework reference (MUST READ)
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Complete setup guide
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Fast command reference

### Running Tests

```bash
# Run all tests
encore test

# Run specific service tests
encore test bookmarks/__tests__/

# Type check before testing (recommended)
npx tsc --noEmit
```

**Testing Architecture**: See `users/__tests__/TESTING_ARCHITECTURE.md` for detailed testing patterns.

**Critical Rule**: Due to Encore's transaction isolation in test mode, NEVER mix direct DB writes with service calls in the same test. Each test should stay at one layer (repository OR API handler).

---

## Key Technologies

### Encore.ts Framework

Modern TypeScript backend framework with built-in:
- **API endpoints** - Type-safe REST/RPC endpoints
- **Database** - Automatic PostgreSQL provisioning
- **Pub/Sub** - Event-driven architecture
- **Object Storage** - S3-compatible bucket storage
- **Cron Jobs** - Scheduled tasks
- **Secrets Management** - Encrypted configuration

**Documentation**: https://encore.dev/docs/ts

**IMPORTANT**: Always reference [llm.txt](./llm.txt) for Encore.ts patterns. It contains:
- Database query methods (`queryRow`, `query`, `exec` - NOT `get`, `all`, `run`)
- Pub/Sub patterns (Topic + Subscription)
- API endpoint patterns
- Error handling conventions

### Deepgram Nova-3 with Audio Intelligence

**Configuration**: See `bookmarks/config/transcription.config.ts`

Features enabled:
- Smart formatting (punctuation, paragraphs)
- Speaker diarization
- Sentiment analysis
- Intent recognition
- Topic detection
- Summarization V2

**⚠️ CRITICAL**: Deepgram uses **plural keys**: `sentiments`, `intents`, `topics` (NOT singular).

**Documentation**: https://developers.deepgram.com/docs/

### OpenAI Responses API (GPT-4.1-mini)

**Configuration**: See `bookmarks/config/transcription.config.ts`

Uses the **Responses API** (NOT Chat Completions):

```typescript
const response = await openai.responses.create({
  model: "gpt-4.1-mini",
  instructions: "System prompt here",
  input: "User input here",
  temperature: 0.7,
  max_output_tokens: 500,
});

const summary = response.output_text;
```

**Documentation**: https://platform.openai.com/docs/api-reference/responses

### Supabase Authentication

Users sign up via Supabase Auth, which triggers a webhook to sync user data to MemAI backend. All API requests include JWT token validated against `SupabaseJWTSecret`.

**Webhook Setup**: See [GETTING_STARTED.md](./GETTING_STARTED.md) for Supabase webhook configuration.

---

## Troubleshooting

### CORS Issues

See [CORS Configuration](#️-cors-configuration-hard-won-lessons) section above for comprehensive troubleshooting.

### Deployment Failures

**Problem**: Deployment succeeds but changes not reflected.

**Solutions**:
1. Verify pushed to `encore` remote: `git remote -v && git log encore/main`
2. Check deployment logs: `encore logs --env=staging`
3. Restart Encore daemon: `encore daemon restart`
4. Force fresh deployment: `git push encore main --force`

### Database Connection Issues

```bash
# Check database exists
encore db list

# Get connection string
encore db conn-uri bookmarks

# Test connection
psql "$(encore db conn-uri bookmarks)" -c "\conninfo"

# Reset database (CAUTION: deletes all data)
encore db reset bookmarks
```

### Processing Pipeline Stuck

```bash
# Check for failed jobs
psql "$(encore db conn-uri bookmarks)" -c "
SELECT id, source, t.status, t.error_message
FROM bookmarks b
LEFT JOIN transcriptions t ON b.id = t.bookmark_id
WHERE t.status = 'failed';"

# View recent processing
psql "$(encore db conn-uri bookmarks)" -c "
SELECT
  'Audio' as type, status, COUNT(*) as count
FROM transcriptions GROUP BY status
UNION ALL
SELECT
  'Web' as type, status::text, COUNT(*) as count
FROM web_contents GROUP BY status;"
```

### Common Errors

**"Authentication required"**
- Verify JWT token is valid (decode at https://jwt.io)
- Check `SupabaseJWTSecret` matches Supabase project
- For local testing, use `/test/*` endpoints (no auth required)

**"Secrets not loaded"**
```bash
encore secret list --type local
encore secret set --type local SecretName
```

**"Server won't start"**
```bash
encore daemon restart
lsof -i :4000  # Check port conflicts
encore run
```

---

## References

### Project Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete development guidelines, architecture patterns, testing strategies
- **[llm.txt](./llm.txt)** - Encore.ts framework reference (read this before coding!)
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Full setup guide with examples
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Fast command reference
- **[Makefile](./Makefile)** - Common commands and workflows
- **[bookmarks/migrations/](./bookmarks/migrations/)** - Database schema evolution

### External Documentation

- **Encore.ts**: https://encore.dev/docs/ts
- **Deepgram API**: https://developers.deepgram.com/docs/
- **OpenAI Responses API**: https://platform.openai.com/docs/api-reference/responses
- **Supabase Auth**: https://supabase.com/docs/guides/auth

---

## Summary

**MemAI Backend** is a production-ready, event-driven system for bookmark management with AI-powered transcription and summarization. Key highlights:

✅ **Separation of Concerns**: Users service, Bookmarks service, separate databases
✅ **Fault-Tolerant Pipeline**: Multi-stage Pub/Sub with data persistence at each stage
✅ **Cloud-Ready**: Object storage for audio, separate frontend deployment
✅ **Type-Safe**: Full TypeScript with strict typing
✅ **Well-Tested**: Comprehensive test suite with clear testing patterns
✅ **Documented CORS**: Extensive troubleshooting documentation for cross-origin deployments

**Getting Started**: Follow [Quick Start](#quick-start) above, then read [CLAUDE.md](./CLAUDE.md) for development patterns.

**Deployment**: Backend to Encore Cloud (`git push encore main`), frontend to Vercel (`vercel --prod`).

---

*Built with [Encore.ts](https://encore.dev) - The Backend Development Platform*
