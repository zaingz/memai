# AGENTS.md - MemAI Backend

> **AI Agent Guide** for working on the MemAI backend codebase. This file provides machine-readable context, build steps, testing patterns, and coding conventions.

---

## 📋 Project Overview

**MemAI** is an AI-powered bookmark management system with automatic transcription, summarization, and daily digest generation. The backend is built on Encore.ts with a React frontend deployed separately to Vercel.

**Key Features:**
- YouTube video transcription using Deepgram Nova-3
- Web content extraction using FireCrawl
- AI summaries via OpenAI GPT-4.1-mini
- Multi-stage Pub/Sub pipeline for fault-tolerant processing
- Supabase authentication with JWT validation

**Architecture:** Separate backend (Encore Cloud) and frontend (Vercel) deployments with two PostgreSQL databases (users, bookmarks).

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Vercel)                       │
│  React + TanStack Query + Supabase Auth + Encore Client        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS + JWT Auth + CORS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Encore Cloud)                       │
│  ┌──────────────┐              ┌──────────────┐                │
│  │ Users Service│              │Bookmarks Svc │                │
│  │              │              │              │                │
│  │ - Auth       │              │ - CRUD       │                │
│  │ - Webhooks   │              │ - Processing │                │
│  │ - JWT Verify │              │ - Digests    │                │
│  └──────────────┘              └──────────────┘                │
│         │                              │                        │
│    PostgreSQL                     PostgreSQL                    │
│    (users DB)                     (bookmarks DB)                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Multi-Stage Pub/Sub Pipeline                  │  │
│  │                                                          │  │
│  │  Bookmark Created → Classification                       │  │
│  │        ↓                                                 │  │
│  │   ┌────┴────┐                                            │  │
│  │   │         │                                            │  │
│  │  Audio     Text                                          │  │
│  │   │         │                                            │  │
│  │   ↓         ↓                                            │  │
│  │  Download  Extract (FireCrawl)                          │  │
│  │   ↓         ↓                                            │  │
│  │  Bucket    Summary                                       │  │
│  │   ↓                                                      │  │
│  │  Transcribe (Deepgram)                                  │  │
│  │   ↓                                                      │  │
│  │  Summary (OpenAI)                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  External Services: Deepgram, OpenAI, FireCrawl, Supabase      │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ CRITICAL: Frontend/Backend Repository Separation

**The frontend directory is NOT tracked in git for this repository.**

### Why This Matters

When deploying to Encore Cloud, the build process attempts to compile ALL TypeScript files in the repository. If frontend code (Vite, React) is present, it causes build failures:

```
unable to resolve module @vitejs/plugin-react: failed to get the node_modules path
--> /workspace/frontend/vite.config.ts:2:1
```

### Solution Applied

- Frontend is listed in `.gitignore` and completely excluded from git tracking
- Frontend deploys independently to Vercel (separate deployment workflow)
- Backend (this repo) only contains Encore services

### Current Repository Structure

```
✅ Tracked in git:
  bookmarks/      # Bookmarks service
  users/          # Users service
  daily_digest/   # Daily digest service
  test/           # Shared test utilities

❌ NOT tracked (in .gitignore):
  frontend/       # React app (Vercel deployment)
```

### Deployment Architecture

- **Backend**: `git push encore main` → Encore Cloud (backend only)
- **Frontend**: Deployed separately to Vercel (from local or separate repo)

**DO NOT add frontend/ back to git!** This will break Encore Cloud builds.

---

## 🚀 Quick Start for Agents

### Prerequisites
- Node.js 18+
- Encore CLI (`brew install encoredev/tap/encore`)
- PostgreSQL (auto-managed by Encore)

### Setup Commands
```bash
# 1. Install dependencies
npm install

# 2. Set secrets (Encore prompts for values)
encore secret set --type local DeepgramAPIKey
encore secret set --type local OpenAIAPIKey
encore secret set --type local FirecrawlAPIKey
encore secret set --type local SupabaseJWTSecret
encore secret set --type local SupabaseServiceRoleKey

# 3. Run backend
encore run

# 4. Server starts at:
# - API: http://localhost:4000
# - Dashboard: http://localhost:9400
```

### Verify Setup
```bash
# Check secrets
encore secret list --type local

# Type check
npx tsc --noEmit

# Run tests
encore test

# Check database
encore db list
```

---

## 📁 Codebase Navigation

### Project Structure
```
memai-backend/
├── bookmarks/              # Bookmarks service (main processing)
│   ├── api.ts             # REST API endpoints
│   ├── db.ts              # Database connection
│   ├── storage.ts         # Encore Bucket for audio files
│   ├── encore.service.ts  # Service registration (imports processors!)
│   ├── config/            # Centralized configuration
│   │   └── transcription.config.ts
│   ├── events/            # Pub/Sub topic definitions
│   │   ├── bookmark-created.events.ts
│   │   ├── bookmark-source-classified.events.ts
│   │   ├── audio-downloaded.events.ts
│   │   └── audio-transcribed.events.ts
│   ├── processors/        # Pub/Sub handlers (3-5 stage pipeline)
│   │   ├── bookmark-classification.processor.ts
│   │   ├── audio-download.processor.ts
│   │   ├── audio-transcription.processor.ts
│   │   └── summary-generation.processor.ts
│   ├── repositories/      # Database access ONLY
│   │   ├── bookmark.repository.ts
│   │   └── transcription.repository.ts
│   ├── services/          # Business logic (uses repositories)
│   │   ├── youtube-downloader.service.ts
│   │   ├── deepgram.service.ts
│   │   └── openai.service.ts
│   ├── types/             # Type definitions (organized by domain)
│   │   ├── domain.types.ts
│   │   ├── api.types.ts
│   │   ├── event.types.ts
│   │   ├── deepgram.types.ts
│   │   └── index.ts
│   ├── utils/             # Pure utility functions
│   ├── migrations/        # SQL migrations (numbered: 1_, 2_, 3_)
│   └── __tests__/         # Tests (co-located with code)
│
├── users/                 # Users service
│   ├── api.ts             # User API endpoints
│   ├── auth.ts            # JWT authentication middleware
│   ├── webhooks.ts        # Supabase webhook handlers
│   ├── db.ts              # Database connection
│   ├── repositories/
│   ├── types/
│   ├── migrations/
│   └── __tests__/
│
├── test/                  # Shared test utilities
│   ├── factories/         # Test data factories
│   ├── mocks/             # Mock implementations
│   └── utils/             # Test helpers
│
├── frontend/              # React frontend (gitignored, Vercel)
│   └── vercel.json        # SPA routing config (CRITICAL!)
│
├── encore.app             # Encore configuration + CORS
├── llm.txt                # Encore.ts framework reference (READ THIS!)
├── CLAUDE.md              # Development guidelines
├── DEVELOPER_GUIDE.md     # Human-readable dev guide
├── Makefile               # Common commands
└── vitest.config.ts       # Test configuration
```

### File Naming Conventions
- `feature.repository.ts` - Database access layer
- `feature.service.ts` - Business logic layer
- `feature.processor.ts` - Pub/Sub event handlers
- `feature.types.ts` - Type definitions
- `feature.config.ts` - Configuration constants
- `feature.test.ts` - Tests (co-located with source)

### Import Patterns
```typescript
// Types - centralized exports
import { Bookmark, CreateBookmarkRequest } from "./types";

// Database
import { db } from "./db";

// Encore primitives
import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { Topic, Subscription } from "encore.dev/pubsub";
import { Bucket } from "encore.dev/storage/objects";

// Test clients
import { usersTestClient } from "~encore/clients";
```

---

## 🧠 Core Concepts

### 1. Encore.ts Framework Patterns

**⚠️ CRITICAL: Always reference `llm.txt` for Encore.ts domain knowledge!**

#### Database Operations (ONLY These Methods Exist)
```typescript
// ✅ CORRECT - Only these methods exist in Encore
const row = await db.queryRow<Type>`SELECT * FROM table WHERE id = ${id}`;
const rows = await db.query<Type>`SELECT * FROM table`;
await db.exec`INSERT INTO table (field) VALUES (${value})`;

// ❌ WRONG - These don't exist in Encore
db.all(), db.get(), db.run()  // NOT AVAILABLE
```

#### API Endpoint Pattern
```typescript
import { api, APIError } from "encore.dev/api";

interface CreateRequest {
  name: string;
}

interface CreateResponse {
  id: number;
  name: string;
}

export const createResource = api(
  { expose: true, method: "POST", path: "/resources", auth: true },
  async (req: CreateRequest): Promise<CreateResponse> => {
    if (!req.name) {
      throw APIError.invalidArgument("name is required");
    }

    const service = new ResourceService(new ResourceRepository(db));
    return await service.create(req.name);
  }
);
```

#### Pub/Sub Pattern
```typescript
import { Topic, Subscription } from "encore.dev/pubsub";

// Topic (package-level variable)
export const resourceCreatedTopic = new Topic<ResourceCreatedEvent>(
  "resource-created",
  { deliveryGuarantee: "at-least-once" }
);

// Subscription (use _ for unused variable if not exported)
const _ = new Subscription(resourceCreatedTopic, "handler-name", {
  handler: async (event) => {
    // Process event
    log.info("Processing event", { resourceId: event.id });
  },
});

// Publishing events
await resourceCreatedTopic.publish({ id, name });
```

#### Object Storage Pattern
```typescript
import { Bucket } from "encore.dev/storage/objects";

export const audioFilesBucket = new Bucket("audio-files");

// Upload
const key = `audio-${bookmarkId}.mp3`;
await audioFilesBucket.upload(key, buffer);

// Download
const data = await audioFilesBucket.download(key);

// Delete
await audioFilesBucket.remove(key);
```

#### JSONB Handling
```typescript
// ❌ WRONG - Double-stringification
deepgram_response = ${JSON.stringify(data)}

// ✅ CORRECT - Encore auto-serializes to JSONB
deepgram_response = ${data}
```

### 2. Multi-Stage Pub/Sub Pipeline

**Design Philosophy:** Fault tolerance through data persistence at each stage.

**Example: YouTube Video Processing**

```
Stage 1: Classification
├─ Input: bookmark-created event
├─ Action: Detect source type (YouTube, Blog, Podcast, etc.)
├─ Persist: Update bookmark.source in DB
└─ Output: bookmark-source-classified event

Stage 2: Audio Download (YouTube/Podcast only)
├─ Input: bookmark-source-classified event
├─ Action: Download audio → Upload to Encore Bucket
├─ Persist: Store bucket key in bookmarks table
└─ Output: audio-downloaded event (with bucket key)

Stage 3: Audio Transcription
├─ Input: audio-downloaded event
├─ Action: Download from bucket → Transcribe with Deepgram
├─ Persist: Store transcript + metadata in transcriptions table
├─ Cleanup: Delete audio from bucket
└─ Output: audio-transcribed event

Stage 4: Summary Generation
├─ Input: audio-transcribed event
├─ Action: Generate OpenAI summary
├─ Persist: Store summary in transcriptions table
└─ Output: Mark bookmark as completed
```

**Benefits:**
- ✅ Fault isolation: Each stage can fail independently
- ✅ Retry safety: Can retry any stage without redoing previous stages
- ✅ Object storage: Audio in Encore Bucket (not filesystem)
- ✅ Data persistence: Results stored immediately at each stage
- ✅ Automatic cleanup: Audio deleted from bucket after transcription

**Processor Pattern:**
```typescript
async function handleEvent(event: StageEvent) {
  try {
    // 1. Fetch data (from DB or bucket)
    const data = await fetchData(event.id);

    // 2. Process (external API call, business logic)
    const result = await processData(data);

    // 3. Persist results IMMEDIATELY
    await repository.saveResults(event.id, result);

    // 4. Cleanup resources (files, temp data)
    await cleanup();

    // 5. Publish next stage event
    await nextStageTopic.publish({ id: event.id, result });
  } catch (error) {
    log.error(error, "Stage failed", { eventId: event.id });
    await repository.markAsFailed(event.id, error.message);
  }
}
```

### 3. Testing Architecture

**⚠️ CRITICAL: Encore has transaction isolation in test mode!**

Each service call runs in a separate transaction. This means:

```typescript
// ❌ WRONG - This FAILS due to transaction isolation!
await userRepo.create({ id, email });  // Transaction A
const result = await userApi.getMe(token);  // Transaction B (can't see A)
// Result: 404 - user not found!

// ✅ CORRECT - Stay at one layer
// Option 1: All DB operations
await userRepo.create({ id, email });
const found = await userRepo.findById(id);  // Same transaction

// Option 2: All service calls
await webhookApi.userCreated(payload);  // Service commits
const result = await userApi.getMe(token);  // Sees committed data
```

**Test Layers (NEVER MIX!):**

1. **Repository Tests** - All DB operations
```typescript
describe("BookmarkRepository", () => {
  it("should create and find bookmark", async () => {
    const bookmark = await bookmarkRepo.create({ url, source });
    const found = await bookmarkRepo.findById(bookmark.id);
    expect(found).toBeDefined();
  });
});
```

2. **Webhook Tests** - Test external integration points
```typescript
describe("Webhook: userCreated", () => {
  it("should sync user from Supabase", async () => {
    const payload = createSupabasePayload({ id, email });
    await webhookApi.userCreated(payload);

    const user = await userRepo.findById(id);
    expect(user).toBeDefined();
  });
});
```

3. **API Handler Tests** - DB setup + service call
```typescript
describe("API: getBookmark", () => {
  it("should return bookmark", async () => {
    // Setup: Direct DB write
    const bookmark = await bookmarkRepo.create({ url, source });

    // Test: Call API endpoint
    const result = await getBookmark({ id: bookmark.id });
    expect(result.url).toBe(url);
  });
});
```

4. **E2E Tests** - All service calls (3-5 tests max, critical flows only)
```typescript
describe("E2E: Bookmark Lifecycle", () => {
  it("should handle create → process → complete flow", async () => {
    // All service calls
    const created = await createBookmark({ url, source });
    // Wait for processing...
    const result = await getBookmark({ id: created.id });
    expect(result.transcription?.status).toBe("completed");
  });
});
```

**Running Tests:**
```bash
# All tests
encore test

# Specific service
encore test bookmarks/__tests__/

# Specific file
encore test bookmarks/__tests__/api/bookmarks-crud.api.test.ts

# Type check first (recommended)
npx tsc --noEmit && encore test
```

### 4. CORS Configuration

**Backend (`encore.app`):**
```json
{
  "global_cors": {
    "allow_origins_without_credentials": ["*"],
    "allow_origins_with_credentials": [
      "http://localhost:5173",
      "https://frontend-*.vercel.app",
      "https://*-zaingzs-projects.vercel.app"
    ]
  }
}
```

**Frontend (must use `credentials: 'include'`):**
```typescript
// frontend/src/lib/encore.ts
export const encoreClient = new Client(apiBaseUrl, {
  requestInit: {
    credentials: 'include',  // ← REQUIRED for auth cookies
  },
});
```

**Troubleshooting CORS:**
```bash
# Test preflight request
curl -X OPTIONS https://staging-memai-backend-cno2.encr.app/bookmarks \
  -H "Origin: https://frontend-zaingzs-projects.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected headers:
# Access-Control-Allow-Origin: https://frontend-zaingzs-projects.vercel.app
# Access-Control-Allow-Credentials: true
```

---

## 🎯 Task Execution Guidelines

### Adding a Backend Feature

**Step 1: Create Types** (`types/`)
```typescript
// types/feature.types.ts
export interface Feature {
  id: number;
  name: string;
  created_at: Date;
}

export interface CreateFeatureRequest {
  name: string;
}

export interface CreateFeatureResponse {
  id: number;
  name: string;
}
```

**Step 2: Create Migration** (`migrations/`)
```sql
-- migrations/5_create_features.up.sql
CREATE TABLE features (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_features_name ON features(name);
```

**Step 3: Create Repository** (`repositories/`)
```typescript
// repositories/feature.repository.ts
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { Feature } from "../types";

export class FeatureRepository {
  constructor(private readonly db: SQLDatabase) {}

  async create(name: string): Promise<Feature> {
    const row = await this.db.queryRow<Feature>`
      INSERT INTO features (name)
      VALUES (${name})
      RETURNING *
    `;
    if (!row) throw new Error("Failed to create feature");
    return row;
  }

  async findById(id: number): Promise<Feature | null> {
    return await this.db.queryRow<Feature>`
      SELECT * FROM features WHERE id = ${id}
    ` || null;
  }

  async list(): Promise<Feature[]> {
    const results: Feature[] = [];
    for await (const row of this.db.query<Feature>`
      SELECT * FROM features ORDER BY created_at DESC
    `) {
      results.push(row);
    }
    return results;
  }
}
```

**Step 4: Create Service (Optional)** (`services/`)
```typescript
// services/feature.service.ts
import { FeatureRepository } from "../repositories/feature.repository";
import { Feature } from "../types";

export class FeatureService {
  constructor(private readonly repo: FeatureRepository) {}

  async createFeature(name: string): Promise<Feature> {
    // Business logic, validation, etc.
    if (!name || name.trim().length === 0) {
      throw new Error("Feature name cannot be empty");
    }

    return await this.repo.create(name.trim());
  }
}
```

**Step 5: Create API Endpoint** (`api.ts`)
```typescript
// api.ts
import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { FeatureRepository } from "./repositories/feature.repository";
import { FeatureService } from "./services/feature.service";
import { CreateFeatureRequest, CreateFeatureResponse } from "./types";

export const createFeature = api(
  { expose: true, method: "POST", path: "/features", auth: false },
  async (req: CreateFeatureRequest): Promise<CreateFeatureResponse> => {
    if (!req.name) {
      throw APIError.invalidArgument("name is required");
    }

    const repo = new FeatureRepository(db);
    const service = new FeatureService(repo);
    const feature = await service.createFeature(req.name);

    return {
      id: feature.id,
      name: feature.name,
    };
  }
);

export const getFeature = api(
  { expose: true, method: "GET", path: "/features/:id", auth: false },
  async (req: { id: number }): Promise<Feature> => {
    const repo = new FeatureRepository(db);
    const feature = await repo.findById(req.id);

    if (!feature) {
      throw APIError.notFound(`Feature ${req.id} not found`);
    }

    return feature;
  }
);
```

**Step 6: Write Tests** (`__tests__/`)
```typescript
// __tests__/api/feature.api.test.ts
import { describe, it, expect } from "vitest";
import { createFeature, getFeature } from "../api";

describe("Feature API", () => {
  it("should create feature", async () => {
    const result = await createFeature({ name: "Test Feature" });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("Test Feature");
  });

  it("should get feature by ID", async () => {
    const created = await createFeature({ name: "Test Feature" });
    const result = await getFeature({ id: created.id });

    expect(result.id).toBe(created.id);
    expect(result.name).toBe("Test Feature");
  });

  it("should throw error for invalid input", async () => {
    await expect(
      createFeature({ name: "" })
    ).rejects.toThrow();
  });
});
```

**Step 7: Validate**
```bash
# Type check
npx tsc --noEmit

# Run tests
encore test bookmarks/__tests__/api/feature.api.test.ts

# Run server
encore run

# Test manually
curl -X POST http://localhost:4000/features \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Feature"}'
```

### Adding a Pub/Sub Processor

**Step 1: Create Event Type** (`events/`)
```typescript
// events/feature-created.events.ts
import { Topic } from "encore.dev/pubsub";

export interface FeatureCreatedEvent {
  featureId: number;
  name: string;
}

export const featureCreatedTopic = new Topic<FeatureCreatedEvent>(
  "feature-created",
  { deliveryGuarantee: "at-least-once" }
);
```

**Step 2: Create Processor** (`processors/`)
```typescript
// processors/feature-notification.processor.ts
import { Subscription } from "encore.dev/pubsub";
import log from "encore.dev/log";
import { featureCreatedTopic } from "../events/feature-created.events";

async function handleFeatureCreated(event: FeatureCreatedEvent) {
  try {
    log.info("Processing feature created event", { featureId: event.featureId });

    // Your processing logic here
    // e.g., send email, update cache, etc.

    log.info("Feature created event processed", { featureId: event.featureId });
  } catch (error) {
    log.error(error, "Failed to process feature created event", {
      featureId: event.featureId,
      error: error.message,
    });
    throw error; // Will trigger retry
  }
}

export const featureCreatedSubscription = new Subscription(
  featureCreatedTopic,
  "feature-notification-processor",
  { handler: handleFeatureCreated }
);
```

**Step 3: Register Processor** (`encore.service.ts`)
```typescript
// encore.service.ts
import { Service } from "encore.dev/service";

export default new Service("bookmarks");

// MUST import processors for them to register!
import "./processors/feature-notification.processor";
```

**Step 4: Publish Events** (in API or other processors)
```typescript
// In api.ts or service
import { featureCreatedTopic } from "./events/feature-created.events";

export const createFeature = api(
  { expose: true, method: "POST", path: "/features" },
  async (req: CreateFeatureRequest): Promise<CreateFeatureResponse> => {
    const feature = await service.createFeature(req.name);

    // Publish event
    await featureCreatedTopic.publish({
      featureId: feature.id,
      name: feature.name,
    });

    return feature;
  }
);
```

### Adding a Frontend Feature

**Step 1: Add API Hook** (`frontend/src/hooks/api/`)
```typescript
// frontend/src/hooks/api/features.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { encoreClient } from '@/lib/encore';

export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string }) =>
      encoreClient.bookmarks.createFeature(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
  });
}

export function useFeature(id: number) {
  return useQuery({
    queryKey: ['features', id],
    queryFn: () => encoreClient.bookmarks.getFeature({ id }),
  });
}

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: () => encoreClient.bookmarks.listFeatures(),
  });
}
```

**Step 2: Create Component** (`frontend/src/components/`)
```typescript
// frontend/src/components/FeatureForm.tsx
import { useState } from 'react';
import { useCreateFeature } from '@/hooks/api/features';

export function FeatureForm() {
  const [name, setName] = useState('');
  const { mutate: createFeature, isPending } = useCreateFeature();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFeature({ name }, {
      onSuccess: () => {
        setName('');
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Feature name"
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Feature'}
      </button>
    </form>
  );
}
```

**Step 3: Add Route** (`frontend/src/App.tsx`)
```typescript
import { Route } from 'react-router-dom';
import { FeaturesPage } from './pages/FeaturesPage';

// In your router
<Route path="/features" element={<FeaturesPage />} />
```

---

## ⚠️ Critical Rules & Constraints

### Encore.ts Framework Rules

**Database Operations:**
- ✅ USE: `db.queryRow<T>()`, `db.query<T>()`, `db.exec()`
- ❌ NEVER: `db.all()`, `db.get()`, `db.run()` (don't exist)

**JSONB Handling:**
- ✅ USE: `column = ${data}` (auto-serializes)
- ❌ NEVER: `column = ${JSON.stringify(data)}` (double-stringifies)

**Logging:**
- ✅ USE: `import log from "encore.dev/log"`
- ❌ NEVER: `console.log()` (not production-ready)

**Error Handling:**
- ✅ USE: `throw APIError.notFound()`, `APIError.invalidArgument()`
- ❌ NEVER: Generic `throw new Error()` without context

### Testing Rules

**Transaction Isolation:**
- ✅ Stay at one layer per test (all DB OR all service calls)
- ❌ NEVER mix DB writes with service calls in same test

**Test Organization:**
- ✅ Repository tests: All DB operations
- ✅ Webhook tests: Test external integrations
- ✅ API tests: DB setup + API call
- ✅ E2E tests: All service calls (3-5 tests max)
- ❌ NEVER use webhooks as test helpers

### Architecture Rules

**Separation of Concerns:**
- Repositories: Database operations ONLY
- Services: Business logic, use repositories
- Processors: Pub/Sub handlers, coordinate services
- Utils: Pure functions, no side effects
- Config: Centralized in `config/` directories

**Service Registration:**
- ✅ MUST import all processors in `encore.service.ts`
- ❌ If not imported, processors won't run!

**Multi-Stage Pipeline:**
- Each stage MUST persist data before publishing next event
- Each stage MUST handle cleanup on failure
- Use Encore Bucket for temp files, NOT filesystem

### External APIs

**Deepgram (Audio Transcription):**
- ✅ USE: Plural keys (`sentiments`, `intents`, `topics`)
- ❌ NEVER: Singular keys (`sentiment`, `intent`, `topic`)

**OpenAI (Summaries):**
- ✅ USE: Responses API (`openai.responses.create()`)
- ❌ NEVER: Old Chat Completions API (`openai.chat.completions.create()`)

**Configuration:**
- ✅ USE: Centralized config in `config/transcription.config.ts`
- ❌ NEVER: Hardcode API keys, model names, or parameters

### Type Safety

**TypeScript Rules:**
- ✅ USE: Explicit interfaces/types for all data
- ✅ USE: `unknown` + narrowing when type is uncertain
- ❌ NEVER: `any` type (strictly forbidden)
- ❌ NEVER: Type assertions without validation (`as Type`)

**File Naming:**
- ✅ USE: `feature.repository.ts`, `feature.service.ts`
- ❌ NEVER: PascalCase (`FeatureRepository.ts`)
- ❌ NEVER: snake_case (`feature_repository.ts`)

### Git & Deployment

**Two Git Remotes:**
```bash
# origin  - GitHub (source control)
# encore  - Encore Cloud (deployment)

# Always push to BOTH:
git push origin main
git push encore main
```

**Frontend Deployment:**
- Frontend deploys separately to Vercel (`vercel --prod`)
- `frontend/vercel.json` is CRITICAL for SPA routing
- Without it, page refreshes return 404

---

## 📟 Commands Reference

### Development Commands
```bash
# Start backend
encore run

# Start with debugging
encore run --debug

# Type check
npx tsc --noEmit

# Run tests
encore test

# Run specific test file
encore test bookmarks/__tests__/api/feature.test.ts

# Run tests with coverage
encore test --coverage
```

### Database Commands
```bash
# List databases
encore db list

# Open database shell
encore db shell bookmarks
encore db shell users

# Get connection URI
encore db conn-uri bookmarks

# Direct psql query
psql "$(encore db conn-uri bookmarks)" -c "SELECT * FROM bookmarks LIMIT 5;"

# Reset database (CAUTION: deletes all data)
encore db reset bookmarks
```

### Deployment Commands
```bash
# Deploy backend (via Makefile)
make deploy-backend

# Deploy backend (manual)
git push encore main

# Deploy frontend (via Makefile)
make deploy-frontend

# Deploy frontend (manual)
cd frontend && vercel --prod

# Deploy both
make deploy-all
```

### Operations Commands
```bash
# View logs
encore logs --env=local
encore logs --env=staging
make logs

# List secrets
encore secret list --type local
encore secret list --type staging

# Set secret
encore secret set --type local SecretName
encore secret set --type staging SecretName

# Restart daemon
encore daemon restart

# Check Encore version
encore version
```

### Utility Commands
```bash
# Check port conflicts
lsof -i :4000

# View project structure
tree -L 2 -I 'node_modules|.encore|encore.gen'

# Search for code patterns
grep -r "pattern" bookmarks/

# Find files
find bookmarks -name "*.ts"
```

---

## 💻 Code Patterns & Examples

### Repository Pattern
```typescript
// repositories/resource.repository.ts
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { Resource } from "../types";

export class ResourceRepository {
  constructor(private readonly db: SQLDatabase) {}

  async create(data: Partial<Resource>): Promise<Resource> {
    const row = await this.db.queryRow<Resource>`
      INSERT INTO resources (name, description)
      VALUES (${data.name}, ${data.description})
      RETURNING *
    `;
    if (!row) throw new Error("Failed to create resource");
    return row;
  }

  async findById(id: number): Promise<Resource | null> {
    return await this.db.queryRow<Resource>`
      SELECT * FROM resources WHERE id = ${id}
    ` || null;
  }

  async update(id: number, data: Partial<Resource>): Promise<Resource> {
    const row = await this.db.queryRow<Resource>`
      UPDATE resources
      SET name = ${data.name}, description = ${data.description}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) throw new Error(`Resource ${id} not found`);
    return row;
  }

  async delete(id: number): Promise<void> {
    await this.db.exec`DELETE FROM resources WHERE id = ${id}`;
  }

  async list(limit = 100, offset = 0): Promise<Resource[]> {
    const results: Resource[] = [];
    for await (const row of this.db.query<Resource>`
      SELECT * FROM resources
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) {
      results.push(row);
    }
    return results;
  }
}
```

### Service Pattern
```typescript
// services/resource.service.ts
import { ResourceRepository } from "../repositories/resource.repository";
import { Resource } from "../types";
import log from "encore.dev/log";

export class ResourceService {
  constructor(private readonly repo: ResourceRepository) {}

  async createResource(name: string, description?: string): Promise<Resource> {
    // Validation
    if (!name || name.trim().length === 0) {
      throw new Error("Resource name is required");
    }

    // Business logic
    const normalizedName = name.trim();

    log.info("Creating resource", { name: normalizedName });

    try {
      const resource = await this.repo.create({
        name: normalizedName,
        description: description?.trim(),
      });

      log.info("Resource created", { id: resource.id });
      return resource;
    } catch (error) {
      log.error(error, "Failed to create resource", { name });
      throw error;
    }
  }

  async updateResource(
    id: number,
    updates: Partial<Resource>
  ): Promise<Resource> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new Error(`Resource ${id} not found`);
    }

    return await this.repo.update(id, updates);
  }
}
```

### API Endpoint Pattern
```typescript
// api.ts
import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { ResourceRepository } from "./repositories/resource.repository";
import { ResourceService } from "./services/resource.service";
import { CreateResourceRequest, ResourceResponse } from "./types";

export const createResource = api(
  { expose: true, method: "POST", path: "/resources", auth: false },
  async (req: CreateResourceRequest): Promise<ResourceResponse> => {
    if (!req.name) {
      throw APIError.invalidArgument("name is required");
    }

    const repo = new ResourceRepository(db);
    const service = new ResourceService(repo);

    try {
      const resource = await service.createResource(req.name, req.description);
      return {
        id: resource.id,
        name: resource.name,
        description: resource.description,
        created_at: resource.created_at,
      };
    } catch (error) {
      throw APIError.internal(`Failed to create resource: ${error.message}`);
    }
  }
);

export const getResource = api(
  { expose: true, method: "GET", path: "/resources/:id", auth: false },
  async (req: { id: number }): Promise<ResourceResponse> => {
    const repo = new ResourceRepository(db);
    const resource = await repo.findById(req.id);

    if (!resource) {
      throw APIError.notFound(`Resource ${req.id} not found`);
    }

    return resource;
  }
);
```

### Pub/Sub Processor Pattern
```typescript
// processors/resource-processor.ts
import { Subscription } from "encore.dev/pubsub";
import log from "encore.dev/log";
import { resourceCreatedTopic } from "../events/resource-created.events";
import { ResourceRepository } from "../repositories/resource.repository";
import { db } from "../db";

async function handleResourceCreated(event: ResourceCreatedEvent) {
  const { resourceId, name } = event;

  log.info("Processing resource created event", { resourceId });

  try {
    // 1. Fetch data
    const repo = new ResourceRepository(db);
    const resource = await repo.findById(resourceId);

    if (!resource) {
      throw new Error(`Resource ${resourceId} not found`);
    }

    // 2. Process (business logic, external API calls)
    const processedData = await processResource(resource);

    // 3. Persist results IMMEDIATELY
    await repo.update(resourceId, { processed: true, data: processedData });

    // 4. Cleanup (if needed)
    // await cleanup();

    // 5. Publish next stage event (if multi-stage)
    // await nextStageTopic.publish({ resourceId });

    log.info("Resource processed successfully", { resourceId });
  } catch (error) {
    log.error(error, "Failed to process resource", {
      resourceId,
      error: error.message,
    });

    // Mark as failed in DB
    const repo = new ResourceRepository(db);
    await repo.update(resourceId, {
      status: "failed",
      error_message: error.message,
    });

    throw error; // Will trigger retry
  }
}

export const resourceCreatedSubscription = new Subscription(
  resourceCreatedTopic,
  "resource-processor",
  { handler: handleResourceCreated }
);
```

### React Hook Pattern (Frontend)
```typescript
// frontend/src/hooks/api/resources.ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { encoreClient } from '@/lib/encore';

interface CreateResourceData {
  name: string;
  description?: string;
}

interface Resource {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResourceData) =>
      encoreClient.bookmarks.createResource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useResource(
  id: number,
  options?: UseQueryOptions<Resource>
) {
  return useQuery({
    queryKey: ['resources', id],
    queryFn: () => encoreClient.bookmarks.getResource({ id }),
    ...options,
  });
}

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: () => encoreClient.bookmarks.listResources(),
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Resource> }) =>
      encoreClient.bookmarks.updateResource({ id, ...data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resources', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
```

---

## 🔧 Debugging & Troubleshooting

### Common Errors & Solutions

**Error: "Authentication required"**
```bash
# Verify JWT token
# Decode at https://jwt.io

# Check secret matches Supabase
encore secret list --type local

# For local testing, use /test/* endpoints (no auth)
curl http://localhost:4000/test/bookmarks
```

**Error: "Secrets not loaded"**
```bash
# List secrets
encore secret list --type local

# Set missing secrets
encore secret set --type local DeepgramAPIKey
encore secret set --type local OpenAIAPIKey
```

**Error: "Server won't start"**
```bash
# Restart daemon
encore daemon restart

# Check port conflicts
lsof -i :4000

# Run with debug
encore run --debug
```

**Error: "Database connection failed"**
```bash
# Check databases exist
encore db list

# Get connection URI
encore db conn-uri bookmarks

# Test connection
psql "$(encore db conn-uri bookmarks)" -c "\conninfo"

# Reset database (CAUTION)
encore db reset bookmarks
```

**Error: "Tests failing with 404"**
```typescript
// Problem: Transaction isolation
await userRepo.create({ id, email });  // Transaction A
const result = await userApi.getMe(token);  // Transaction B (404!)

// Solution: Stay at one layer
// Option 1: All DB
await userRepo.create({ id, email });
const found = await userRepo.findById(id);

// Option 2: All service calls
await webhookApi.userCreated(payload);
const result = await userApi.getMe(token);
```

**Error: "CORS errors in browser"**
```bash
# 1. Check encore.app has correct origins
cat encore.app

# 2. Verify frontend has credentials: 'include'
# frontend/src/lib/encore.ts

# 3. Test with curl
curl -i -X OPTIONS https://staging-memai-backend-cno2.encr.app/bookmarks \
  -H "Origin: https://frontend-zaingzs-projects.vercel.app"

# 4. Restart daemon
encore daemon restart
```

**Error: "Deployment not updating"**
```bash
# 1. Check pushed to correct remote
git remote -v
git log encore/main

# 2. Force push
git push encore main --force

# 3. Check logs
encore logs --env=staging

# 4. Restart daemon
encore daemon restart
```

### Debugging Workflow

**Step 1: Check Logs**
```bash
# Local logs
encore logs --env=local

# Staging logs
encore logs --env=staging

# Filter logs
encore logs --env=staging | grep "ERROR"
```

**Step 2: Check Database**
```bash
# Open shell
encore db shell bookmarks

# Check recent bookmarks
SELECT id, url, source, created_at
FROM bookmarks
ORDER BY created_at DESC
LIMIT 10;

# Check transcription status
SELECT
  b.id,
  b.url,
  t.status,
  t.error_message
FROM bookmarks b
LEFT JOIN transcriptions t ON b.id = t.bookmark_id
WHERE t.status = 'failed';
```

**Step 3: Test API Manually**
```bash
# Create bookmark
curl -X POST http://localhost:4000/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "source": "youtube",
    "client_time": "2025-01-01T00:00:00Z"
  }'

# Get bookmark
curl http://localhost:4000/bookmarks/1

# List bookmarks
curl http://localhost:4000/bookmarks?limit=10&offset=0
```

**Step 4: Run Tests**
```bash
# Type check first
npx tsc --noEmit

# Run tests
encore test

# Run specific test
encore test bookmarks/__tests__/api/bookmarks-crud.api.test.ts
```

### Performance Debugging

**Check Slow Queries:**
```sql
-- In database shell
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Check Pub/Sub Processing:**
```bash
# Check for stuck jobs in logs
encore logs --env=staging | grep "Processing"

# Check database for failed jobs
psql "$(encore db conn-uri bookmarks)" -c "
SELECT COUNT(*), status
FROM transcriptions
GROUP BY status;
"
```

---

## ✅ Validation Checklist

### Before Committing
- [ ] Type check passes: `npx tsc --noEmit`
- [ ] All tests pass: `encore test`
- [ ] No console.log statements (use `log` from encore.dev)
- [ ] No hardcoded API keys or secrets
- [ ] No dead code or unused imports
- [ ] All new code has tests
- [ ] Migrations are numbered correctly
- [ ] Processors registered in `encore.service.ts`

### Before Deploying Backend
- [ ] All tests pass locally
- [ ] Type check passes
- [ ] Secrets set for environment: `encore secret list --type staging`
- [ ] Migrations tested locally: `encore db reset bookmarks && encore run`
- [ ] Pushed to both remotes: `git push origin main && git push encore main`
- [ ] Deployment logs checked: `encore logs --env=staging`

### Before Deploying Frontend
- [ ] Backend API endpoints tested
- [ ] Environment variables set in Vercel
- [ ] `vercel.json` exists (SPA routing)
- [ ] `credentials: 'include'` set in Encore client
- [ ] CORS origins configured in `encore.app`
- [ ] Production build succeeds: `cd frontend && npm run build`

### Code Review Checklist
- [ ] Follows repository pattern (DB access ONLY)
- [ ] Follows service pattern (business logic, uses repos)
- [ ] Follows processor pattern (event handling)
- [ ] Uses centralized config (no hardcoded values)
- [ ] Uses structured logging with context
- [ ] Handles errors gracefully with specific messages
- [ ] No `any` types (use proper types or `unknown`)
- [ ] Test coverage for new features
- [ ] Tests don't mix DB writes with service calls

---

## 📚 Key Documentation References

### Project Documentation
- **`llm.txt`** - Encore.ts framework reference (MUST READ before coding!)
- **`CLAUDE.md`** - Complete development guidelines and patterns
- **`DEVELOPER_GUIDE.md`** - Human-readable developer guide
- **`README.md`** - Project overview and CORS troubleshooting
- **`Makefile`** - All available commands
- **`users/__tests__/TESTING_ARCHITECTURE.md`** - Testing patterns

### External Documentation
- **Encore.ts**: https://encore.dev/docs/ts
- **Deepgram API**: https://developers.deepgram.com/docs/
- **OpenAI Responses API**: https://platform.openai.com/docs/api-reference/responses
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **TanStack Query**: https://tanstack.com/query/latest

---

## 🎯 Quick Reference

### Most Common Commands
```bash
encore run                   # Start backend
encore test                  # Run tests
npx tsc --noEmit            # Type check
make deploy-backend         # Deploy backend
make deploy-frontend        # Deploy frontend
encore logs --env=staging   # View logs
encore db shell bookmarks   # Database shell
```

### Most Common Issues
1. **Transaction isolation in tests** → Keep tests at one layer (all DB OR all service calls)
2. **CORS errors** → Check `encore.app` + `credentials: 'include'` in frontend
3. **Deepgram keys** → Use PLURAL (`sentiments`, not `sentiment`)
4. **Page refresh 404** → Check `frontend/vercel.json` exists
5. **Deployment not updating** → Push to `encore` remote, not just `origin`

### Most Important Files
- `encore.app` - CORS + service configuration
- `llm.txt` - Encore.ts framework reference
- `CLAUDE.md` - Development guidelines
- `frontend/vercel.json` - SPA routing (CRITICAL!)
- `Makefile` - All commands
- `vitest.config.ts` - Test configuration

---

## 📌 Agent Hints

> **Processor Registration**: All processors MUST be imported in `encore.service.ts` or they won't run!

> **Database Methods**: Only `queryRow`, `query`, and `exec` exist. NOT `get`, `all`, or `run`.

> **JSONB**: Never `JSON.stringify()` for JSONB columns. Encore auto-serializes.

> **Testing**: Never mix DB writes with service calls in same test due to transaction isolation.

> **Deepgram**: API keys are PLURAL: `sentiments`, `intents`, `topics` (not singular).

> **OpenAI**: Use Responses API (`responses.create()`), NOT Chat Completions API.

> **Two Remotes**: `origin` for GitHub, `encore` for deployment. Push to BOTH.

> **CORS**: Frontend MUST use `credentials: 'include'` for authenticated requests.

> **SPA Routing**: `frontend/vercel.json` is CRITICAL or page refreshes return 404.

> **Multi-Stage Pipeline**: Each stage MUST persist data before publishing next event.

---

**Version:** 1.0.0
**Last Updated:** 2025-11-02
**Framework:** Encore.ts (TypeScript)
**Node.js:** 18+
**Project:** MemAI Backend

---

*This file is optimized for AI coding agents. For human-readable documentation, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) and [README.md](./README.md).*
