# MemAI Backend

> AI-powered bookmark management system with automatic transcription, summarization, and daily digest generation.

## 📁 Repository Structure

```
memai-backend/
├── backend/              # Encore.ts backend (bookmarks, users services)
│   ├── bookmarks/        # Bookmark service with AI processing pipeline
│   ├── users/            # User authentication service
│   ├── test/             # Shared test utilities
│   ├── encore.app        # Encore configuration
│   ├── package.json      # Backend dependencies
│   └── tsconfig.json     # TypeScript configuration
│
├── frontend/             # React + Vite frontend (deployed to Vercel)
│   ├── src/              # React components, pages, API client
│   ├── package.json      # Frontend dependencies
│   └── vercel.json       # Vercel deployment config
│
├── CLAUDE.md            # AI development instructions
├── agents.md            # AI agent patterns
├── llm.txt              # Encore.ts framework reference
├── DEVELOPER_GUIDE.md   # Technical reference
├── Makefile             # Deployment automation
└── README.md            # This file
```

## Project Overview

**MemAI** is a full-stack application that helps users save and process content from various sources (YouTube, podcasts, blogs, articles) with AI-powered transcription and summarization. The backend is built on Encore.ts with a React frontend deployed separately to Vercel.

### Tech Stack

**Backend (Encore.ts):**
- **Encore.ts** - TypeScript backend framework with built-in database, Pub/Sub, and object storage
- **PostgreSQL** - Two separate databases (users, bookmarks) for service isolation
- **Deepgram Nova-3** - Audio transcription with Audio Intelligence features
- **OpenAI GPT-4.1-mini** - AI summarization via Responses API
- **Supabase Auth** - User authentication and JWT validation

**Frontend (React + Vite):**
- **React 18 + TypeScript** - Modern React with full type safety
- **Vite** - Fast build tooling
- **TanStack Query** - Server state management
- **Tailwind CSS + shadcn/ui** - Styling and component library
- **Vercel** - Separate deployment platform

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

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Encore CLI** - `brew install encoredev/tap/encore`
- **PostgreSQL** (managed by Encore automatically)
- **API Keys** (see Environment Setup below)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd memai-backend

# Install backend dependencies
cd backend
npm install

# Set up secrets (choose one method):
# Method 1: Copy template and fill in values
cp .secrets.local.cue.example .secrets.local.cue
# Then edit .secrets.local.cue with your actual API keys

# Method 2: Use Encore CLI (will prompt for values)
encore secret set --type local DeepgramAPIKey
encore secret set --type local OpenAIAPIKey
encore secret set --type local FirecrawlAPIKey
encore secret set --type local SupabaseJWTSecret

# Install frontend dependencies
cd ../frontend
npm install
```

### Running Locally

**Terminal 1 - Backend:**
```bash
cd backend
encore run

# Server starts at:
# API: http://localhost:4000
# Dashboard: http://localhost:9400
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev

# Frontend starts at: http://localhost:5173
```

Or use the Makefile from the root:
```bash
make dev-backend    # Start backend
make deploy-backend # Deploy backend
make deploy-frontend # Deploy frontend
```

---

## 📚 Documentation

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Complete technical reference
- **[CLAUDE.md](./CLAUDE.md)** - AI development instructions
- **[agents.md](./agents.md)** - AI agent patterns
- **[llm.txt](./llm.txt)** - Encore.ts framework reference

---

## 🚢 Deployment

### Backend Deployment (Encore Cloud)

```bash
# From backend/ directory
cd backend
git remote add encore encore://memai-backend-cno2
git push encore main

# Or use Makefile from root
make deploy-backend
```

### Frontend Deployment (Vercel)

```bash
# From frontend/ directory
cd frontend
vercel --prod

# Or use Makefile from root
make deploy-frontend
```

**Environment Variables (Vercel):**
```bash
VITE_SUPABASE_URL=https://wykjjshvcwfiyvzmvocf.supabase.co
VITE_SUPABASE_ANON_KEY=<your-key>
VITE_API_BASE_URL=https://staging-memai-backend-cno2.encr.app
```

---

## 🧪 Testing

```bash
# Run all tests
cd backend
encore test

# Run specific test file
encore test bookmarks/__tests__/bookmark.repository.test.ts

# Type check
npx tsc --noEmit

# Or use Makefile from root
make test
make typecheck
```

---

## 🗄️ Database Operations

```bash
cd backend

# List databases
encore db list

# Open database shell
encore db shell bookmarks
encore db shell users

# Get connection URI
encore db conn-uri bookmarks

# Reset database (⚠️ deletes all data)
encore db reset bookmarks
```

---

## 🔐 Environment Setup

### Required Secrets (Backend)

**Method 1: Using Template File (Recommended for Development)**

```bash
cd backend
cp .secrets.local.cue.example .secrets.local.cue
# Edit .secrets.local.cue and fill in your actual API keys
```

**Method 2: Using Encore CLI**

```bash
cd backend
encore secret set --type local DeepgramAPIKey
encore secret set --type local OpenAIAPIKey
encore secret set --type local FirecrawlAPIKey
encore secret set --type local SupabaseJWTSecret
```

**Note:** The `.secrets.local.cue` file is gitignored and should never be committed.

For production:
```bash
encore secret set --type prod DeepgramAPIKey
encore secret set --type prod OpenAIAPIKey
encore secret set --type prod FirecrawlAPIKey
encore secret set --type prod SupabaseJWTSecret
```

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from Settings → API
3. Configure webhook in `backend/encore.app`:

```json
{
  "global_cors": {
    "allow_origins_with_credentials": [
      "http://localhost:5173",
      "https://your-frontend.vercel.app"
    ]
  }
}
```

---

## 📊 Features

### Bookmarks
- ✅ Save content from YouTube, podcasts, blogs, articles
- ✅ Auto-classification by source type
- ✅ Multi-stage async processing pipeline
- ✅ Audio transcription with Deepgram Nova-3
- ✅ Text extraction with FireCrawl
- ✅ AI summarization with OpenAI

### Daily Digests
- ✅ Automatic daily summary generation (9 PM GMT)
- ✅ Map-reduce pattern for large content batches
- ✅ News-bulletin style formatting
- ✅ Source breakdown and metadata
- ✅ Manual generation via API

### User Management
- ✅ Supabase authentication
- ✅ JWT-based API access
- ✅ Webhook sync from Supabase to local DB
- ✅ User-scoped bookmarks and digests

---

## 🛠️ Development Workflow

### Making Changes

1. **Code in `backend/` or `frontend/`**
2. **Test locally:**
   ```bash
   cd backend && encore test
   cd frontend && npm run build
   ```

3. **Type check:**
   ```bash
   cd backend && npx tsc --noEmit
   ```

4. **Commit and deploy:**
   ```bash
   git add .
   git commit -m "feat: your feature"
   git push origin main
   make deploy-backend
   make deploy-frontend
   ```

### Adding a New Service

1. Create service directory: `backend/new-service/`
2. Add `encore.service.ts`, `api.ts`, `db.ts`
3. Update `backend/encore.app` if needed
4. Run migrations
5. Deploy

---

## 🐛 Troubleshooting

### Backend won't start
```bash
cd backend
encore daemon restart
encore run
```

### Frontend build fails
```bash
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

### Database issues
```bash
cd backend
encore db reset bookmarks
encore run
```

### CORS errors
Check `backend/encore.app` includes your frontend URL in `allow_origins_with_credentials`.

---

## 📈 Performance

- **Audio Processing**: ~30s per 10min video (Deepgram)
- **Text Extraction**: ~5s per article (FireCrawl)
- **Daily Digest**: ~60s for 50 bookmarks (map-reduce)
- **Frontend Build**: ~1s (Vite)
- **Backend Build**: ~5s (Encore)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`make test`)
5. Commit (`git commit -m 'feat: add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **Encore.ts** - Excellent TypeScript backend framework
- **Deepgram** - High-quality audio transcription
- **OpenAI** - Powerful AI summarization
- **Supabase** - Authentication and database platform
- **Vercel** - Frontend hosting platform

---

## 📞 Support

- **Documentation**: See `DEVELOPER_GUIDE.md`
- **Issues**: GitHub Issues
- **Encore Docs**: https://encore.dev/docs
- **API Dashboard**: http://localhost:9400 (when backend running)
