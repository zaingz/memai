# MemAI Developer Guide
**Quick reference for engineers working on this project**

---

## 🏗️ Architecture Overview

```
┌─────────────────────┐         ┌──────────────────────┐
│  Frontend (Vercel)  │────────▶│  Backend (Encore)    │
│                     │  HTTPS  │                      │
│ React + Vite        │  CORS   │ Encore.ts            │
│ TanStack Query      │   ✓     │ PostgreSQL (2 DBs)   │
│ Supabase Auth       │         │ Deepgram + OpenAI    │
│ React Router        │         │ Pub/Sub Pipeline     │
└─────────────────────┘         └──────────────────────┘
     (Separate)                       (Separate)
```

**Two Separate Deployments:**
- Frontend → Vercel (React SPA)
- Backend → Encore Cloud (TypeScript microservices)

---

## 📦 Tech Stack

### Backend
- **Framework**: Encore.ts (TypeScript microservices)
- **Database**: PostgreSQL (2 separate DBs: `bookmarks`, `users`)
- **Transcription**: Deepgram Nova-3 with Audio Intelligence
- **AI Summary**: OpenAI Responses API (GPT-4.1-mini)
- **Auth**: Supabase (JWT-based)
- **Storage**: Encore Object Storage (for temp audio files)

### Frontend
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query v5
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: Supabase Client
- **API Client**: Auto-generated Encore client

---

## 🗂️ Project Structure

```
memai-backend/
├── bookmarks/              # Bookmarks service
│   ├── api.ts             # API endpoints
│   ├── db.ts              # Database connection
│   ├── encore.service.ts  # Service registration (MUST import processors!)
│   ├── storage.ts         # Object storage bucket
│   ├── config/            # Centralized configuration
│   ├── events/            # Pub/Sub topic definitions
│   ├── processors/        # Pub/Sub handlers (3-stage pipeline)
│   ├── repositories/      # Database access ONLY
│   ├── services/          # Business logic (uses repositories)
│   ├── types/             # Type definitions (domain, API, events)
│   ├── utils/             # Pure utility functions
│   ├── migrations/        # SQL migrations (numbered: 1_, 2_, 3_)
│   └── __tests__/         # Tests (co-located with source)
│
├── users/                 # Users service
│   ├── api.ts             # User API endpoints
│   ├── auth.ts            # Auth middleware
│   ├── webhooks.ts        # Supabase webhook handlers
│   ├── repositories/      # Database access
│   └── migrations/        # SQL migrations
│
├── test/                  # Shared test utilities
│   ├── factories/         # Test data factories
│   ├── mocks/             # Mock implementations
│   └── utils/             # Test helpers
│
├── frontend/              # Frontend (gitignored except vercel.json)
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # React hooks (API calls)
│   │   ├── lib/           # Utilities (encore client, supabase)
│   │   └── contexts/      # React contexts (auth)
│   └── vercel.json        # Vercel SPA routing config (CRITICAL!)
│
├── encore.app             # Encore configuration + CORS
├── Makefile               # Common commands
├── CLAUDE.md              # Development guidelines (READ THIS!)
├── llm.txt                # Encore.ts framework reference
└── README.md              # Project documentation
```

---

## 🎯 Core Concepts

### 1. **Service Architecture** (Encore.ts)

**Single Responsibility Principle:**
- **Repositories**: Database operations ONLY
- **Services**: Business logic, use repositories
- **Processors**: Pub/Sub handlers, coordinate services
- **Utils**: Pure functions, no side effects
- **Config**: Centralized in `config/` directories

**Example:**
```typescript
// ❌ WRONG: Business logic in repository
class UserRepository {
  async createUser(data) {
    // Validate email format
    // Hash password
    // Check duplicate
    // Insert into DB
  }
}

// ✅ CORRECT: Separation of concerns
class UserRepository {
  async create(data) {
    return await db.queryRow`INSERT INTO users...`;
  }
}

class UserService {
  constructor(private repo: UserRepository) {}
  async createUser(data) {
    this.validateEmail(data.email);
    const hashedPassword = await this.hashPassword(data.password);
    await this.repo.create({ ...data, password: hashedPassword });
  }
}
```

### 2. **Multi-Stage Pub/Sub Pipeline**

YouTube transcription uses a 3-stage fault-tolerant pipeline:

```
Stage 1: YouTube Download
  ↓ Downloads audio → Uploads to Object Storage → Publishes event
Stage 2: Audio Transcription
  ↓ Downloads from bucket → Transcribes → Saves to DB → Deletes audio → Publishes event
Stage 3: Summary Generation
  ↓ Generates OpenAI summary → Saves to DB → Marks complete
```

**Why?** Each stage persists data immediately. If Stage 2 fails, Stage 1 data is safe.

**Key Pattern:**
```typescript
// Stage N Processor
async function handleEvent(event: StageNEvent) {
  try {
    // 1. Download/fetch data
    // 2. Process
    // 3. Store results in DB immediately
    // 4. Cleanup resources
    // 5. Publish next stage event
    await nextStageTopic.publish({ ... });
  } catch (error) {
    // Cleanup and mark as failed
    await repo.markAsFailed(id, error.message);
  }
}
```

### 3. **Database Operations** (Encore.ts)

**ONLY these methods exist:**
```typescript
// ✅ CORRECT - From llm.txt
const row = await db.queryRow<Type>`SELECT * FROM table WHERE id = ${id}`;
const rows = await db.query<Type>`SELECT * FROM table`;
await db.exec`INSERT INTO table (field) VALUES (${value})`;

// ❌ WRONG - These don't exist in Encore
db.all(), db.get(), db.run()  // NOT AVAILABLE
```

**JSONB Handling:**
```typescript
// ❌ WRONG: Double-stringification
deepgram_response = ${JSON.stringify(data)}

// ✅ CORRECT: Encore auto-serializes
deepgram_response = ${data}
```

### 4. **Testing Architecture** (CRITICAL!)

Encore has **transaction isolation** in test mode. Each service call = separate transaction.

**Test Layers (NEVER MIX!):**

1. **Repository Tests**: All DB operations
```typescript
await userRepo.create({ id, email });
const found = await userRepo.findById(id);  // ✅ Same transaction
```

2. **Webhook Tests**: Test external integrations
```typescript
await webhookApi.userCreated(payload);  // Service commits
const user = await userRepo.findById(id);  // ✅ Sees committed data
```

3. **API Handler Tests**: DB setup + service call
```typescript
await userRepo.create({ id, email });  // Test fixture
const result = await usersTestClient.me(undefined, createAuthOpts(token));  // ✅ Works
```

4. **E2E Tests**: All service calls (3-5 tests max)
```typescript
await webhookApi.userCreated(payload);  // ✅
await userApi.updateMe({ name }, token);  // ✅
```

**❌ COMMON MISTAKE:**
```typescript
// This FAILS due to transaction isolation!
await userRepo.create({ id, email });  // Transaction A
const result = await userApi.getMe(token);  // Transaction B (can't see A)
// Result: 404 - user not found!
```

### 5. **CORS Configuration** (Hard-Won Lesson!)

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

**Frontend (`lib/encore.ts`):**
```typescript
export const encoreClient = new Client(apiBaseUrl, {
  requestInit: {
    credentials: 'include',  // ← REQUIRED for auth cookies
  },
});
```

**Frontend (`vercel.json`):**
```json
{
  "rewrites": [{
    "source": "/(.*)",
    "destination": "/index.html"
  }]
}
```
**Why?** Fixes SPA routing on page refresh. Without this, deep routes return 404.

---

## 🚀 Development Workflow

### Quick Start

```bash
# 1. Install dependencies
make install

# 2. Set up secrets (first time only)
encore secret set --type local DEEPGRAM_API_KEY
encore secret set --type local OPENAI_API_KEY
encore secret set --type local SUPABASE_JWT_SECRET
encore secret set --type local SUPABASE_SERVICE_ROLE_KEY

# 3. Run backend
make dev-backend

# 4. Run frontend (separate terminal)
cd frontend && npm run dev
```

### Common Commands (via Makefile)

```bash
# Development
make dev-backend         # Run backend locally
make install             # Install dependencies
make clean               # Remove build artifacts

# Testing & Validation
make test                # Run all tests
make typecheck           # Check TypeScript types

# Deployment
make deploy-backend      # Deploy to Encore Cloud
make deploy-frontend     # Deploy to Vercel
make deploy-all          # Deploy both

# Operations
make logs                # View staging logs
make db-shell            # Open database shell
```

### Manual Commands

```bash
# Backend
encore run               # Start dev server
encore test              # Run tests
encore db shell bookmarks  # Database shell
encore logs --env=staging  # View logs

# Frontend
cd frontend
npm run dev              # Dev server
npm run build            # Production build
vercel --prod            # Deploy to production

# Type Checking
npx tsc --noEmit         # Check all TypeScript
```

---

## 🧪 Testing

### Test Structure

```typescript
// bookmarks/__tests__/api/bookmarks-crud.api.test.ts
describe("Bookmarks API", () => {
  it("should create bookmark", async () => {
    const result = await createBookmark({
      url: "https://youtube.com/watch?v=123",
      source: "youtube",
      client_time: new Date().toISOString()
    });

    expect(result.id).toBeDefined();
    expect(result.url).toBe("https://youtube.com/watch?v=123");
  });
});
```

### Running Tests

```bash
# All tests
encore test

# Specific service
encore test bookmarks/__tests__/

# Specific file
encore test bookmarks/__tests__/api/bookmarks-crud.api.test.ts

# With coverage
encore test --coverage
```

### Test Patterns

**✅ DO:**
- Test business logic thoroughly
- Use test factories for data creation
- Mock external APIs (Deepgram, OpenAI)
- Keep E2E tests minimal (3-5 tests)

**❌ DON'T:**
- Mix DB writes with service calls (transaction isolation!)
- Use webhooks as test helpers (they're external integrations)
- Test Encore framework itself
- Write too many E2E tests

---

## 📝 Adding a New Feature

### Backend Feature

**1. Create Types** (`types/`)
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
```

**2. Create Migration** (`migrations/`)
```sql
-- migrations/5_create_features.up.sql
CREATE TABLE features (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**3. Create Repository** (`repositories/`)
```typescript
// repositories/feature.repository.ts
export class FeatureRepository {
  constructor(private readonly db: SQLDatabase) {}

  async create(name: string): Promise<Feature> {
    const row = await this.db.queryRow<Feature>`
      INSERT INTO features (name) VALUES (${name})
      RETURNING *
    `;
    if (!row) throw new Error("Failed to create feature");
    return row;
  }
}
```

**4. Create Service** (`services/`)
```typescript
// services/feature.service.ts
export class FeatureService {
  constructor(private readonly repo: FeatureRepository) {}

  async createFeature(name: string): Promise<Feature> {
    // Business logic here
    return await this.repo.create(name);
  }
}
```

**5. Create API Endpoint** (`api.ts`)
```typescript
// api.ts
export const createFeature = api(
  { expose: true, method: "POST", path: "/features", auth: true },
  async (req: CreateFeatureRequest): Promise<Feature> => {
    const service = new FeatureService(new FeatureRepository(db));
    return await service.createFeature(req.name);
  }
);
```

**6. Write Tests** (`__tests__/`)
```typescript
// __tests__/api/feature.api.test.ts
describe("Feature API", () => {
  it("should create feature", async () => {
    const result = await createFeature({ name: "Test" });
    expect(result.name).toBe("Test");
  });
});
```

### Frontend Feature

**1. Add API Hook** (`src/hooks/api/`)
```typescript
// src/hooks/api/features.ts
export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFeatureRequest) =>
      encoreClient.features.createFeature(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
  });
}
```

**2. Create Component** (`src/components/` or `src/pages/`)
```typescript
// src/components/FeatureForm.tsx
export function FeatureForm() {
  const { mutate: createFeature } = useCreateFeature();

  const handleSubmit = (name: string) => {
    createFeature({ name });
  };

  return <form onSubmit={...}>...</form>;
}
```

**3. Add Route** (`src/App.tsx`)
```typescript
<Route path="/features" element={<FeaturesPage />} />
```

---

## 🔧 Key Utilities & Tools

### Encore.ts Specific

```typescript
// Logging (NEVER use console.log!)
import log from "encore.dev/log";
log.info("Processing...", { context });
log.error(error, "Failed", { details });

// API Errors
import { APIError } from "encore.dev/api";
throw APIError.notFound("Resource not found");
throw APIError.invalidArgument("Invalid input");

// Object Storage
import { Bucket } from "encore.dev/storage/objects";
const bucket = new Bucket("audio-files");
await bucket.upload("key", buffer);
const data = await bucket.download("key");
await bucket.remove("key");

// Pub/Sub
import { Topic } from "encore.dev/pubsub";
const topic = new Topic<EventType>("topic-name", {
  deliveryGuarantee: "at-least-once",
});
await topic.publish({ data });
```

### Test Utilities

```typescript
// Test factories
import { createMockBookmark } from "@/test/factories/bookmark.factory";
const bookmark = createMockBookmark({ url: "custom" });

// Test utilities
import { generateTestJWT, createAuthOpts } from "@/test/utils/auth";
const token = await generateTestJWT(userId, email);
const result = await usersTestClient.me(undefined, createAuthOpts(token));
```

---

## ⚠️ Critical Gotchas

### 1. **Deepgram Uses PLURAL Keys!**
```typescript
// ❌ WRONG
response.results.sentiment

// ✅ CORRECT
response.results.sentiments  // Note the 's'
response.results.intents
response.results.topics
```

### 2. **OpenAI Responses API (Not Chat Completions!)**
```typescript
// ✅ CORRECT: Responses API (2025)
const response = await openai.responses.create({
  model: "gpt-4.1-mini",
  instructions: "System prompt",
  input: "User input",
});
const text = response.output_text;

// ❌ WRONG: Old Chat Completions API
await openai.chat.completions.create({ ... });
```

### 3. **Two Git Remotes**
```bash
git remote -v
# origin  - GitHub (code backup)
# encore  - Encore Cloud (deployment)

# Always push to BOTH:
git push origin main
git push encore main

# Or use Makefile:
make deploy-backend  # Pushes to encore remote
```

### 4. **Processor Registration**
```typescript
// encore.service.ts - MUST import processors!
import "./processors/youtube-download.processor";
import "./processors/audio-transcription.processor";
import "./processors/summary-generation.processor";

// If you don't import, processors won't run!
```

### 5. **Frontend SPA Routing**
`frontend/vercel.json` is CRITICAL for routing to work. Without it, page refreshes return 404.

### 6. **Type Safety**
```typescript
// ❌ NEVER use 'any'
const data: any = ...;

// ✅ Use proper types
const data: BookmarkResponse = ...;

// ✅ Or unknown + narrowing
const data: unknown = ...;
if (isBookmark(data)) { ... }
```

---

## 🚢 Deployment

### Backend (Encore Cloud)

```bash
# Via Makefile
make deploy-backend

# Or manually
git push encore main
```

**What happens:**
1. Push to `encore` remote triggers deployment
2. Encore builds TypeScript
3. Runs migrations on PostgreSQL
4. Deploys to staging environment
5. URL: https://staging-memai-backend-cno2.encr.app

### Frontend (Vercel)

```bash
# Via Makefile
make deploy-frontend

# Or manually
cd frontend && vercel --prod
```

**What happens:**
1. Vercel builds Vite production bundle
2. Uses `vercel.json` for SPA routing
3. Deploys to production
4. URL: https://frontend-one-liart-67.vercel.app

### Environment Variables

**Backend (Encore Secrets):**
```bash
# Staging
encore secret set --type staging DEEPGRAM_API_KEY
encore secret set --type staging OPENAI_API_KEY

# Production (when ready)
encore secret set --type prod DEEPGRAM_API_KEY
encore secret set --type prod OPENAI_API_KEY
```

**Frontend (Vercel):**
```bash
cd frontend

# Set environment variables
vercel env add VITE_API_BASE_URL production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production

# List variables
vercel env ls production
```

---

## 📚 Documentation References

- **README.md** - Project overview, CORS troubleshooting
- **CLAUDE.md** - Development guidelines, testing patterns, type safety
- **llm.txt** - Complete Encore.ts framework reference (MUST READ!)
- **GETTING_STARTED.md** - Setup guide with examples
- **Makefile** - Available commands

---

## 🆘 Troubleshooting

### CORS Issues
1. Check `encore.app` has correct origins
2. Verify frontend has `credentials: 'include'`
3. Test with curl: `curl -i -X OPTIONS <url> -H "Origin: <frontend-url>"`
4. Restart Encore daemon: `encore daemon restart`

### Deployment Failures
1. Check you pushed to correct remote: `git remote -v`
2. Verify `encore.app` is valid JSON (no comments!)
3. Check logs: `make logs` or `encore logs --env=staging`
4. Ensure migrations are numbered correctly

### Test Failures
1. **Transaction isolation**: Don't mix DB writes with service calls
2. Check you're using `encore test` (not direct vitest)
3. Verify mocks are set up correctly
4. Run `npx tsc --noEmit` to check types first

### Type Errors
1. Run `npx tsc --noEmit` to see all errors
2. Check `tsconfig.json` excludes frontend
3. Ensure types are exported from `types/index.ts`
4. Never use `any` - fix with proper types

---

## ✅ Before Committing

```bash
# 1. Type check
make typecheck

# 2. Run tests
make test

# 3. Check for dead code
git status  # No untracked temp files

# 4. Verify changes
git diff

# 5. Commit with descriptive message
git add .
git commit -m "feat: add feature X

- Details about changes
- Why these changes were made

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 6. Push to both remotes
git push origin main
git push encore main
```

---

## 🎯 Quick Reference Card

```bash
# Most Common Commands
make dev-backend         # Start backend
make test                # Run tests
make typecheck           # Check types
make deploy-all          # Deploy both services
make logs                # View logs

# Most Common Issues
1. Transaction isolation in tests → Keep tests at one layer
2. CORS errors → Check encore.app + credentials: 'include'
3. Deepgram keys → Use PLURAL (sentiments, not sentiment)
4. Page refresh 404 → Check frontend/vercel.json exists
5. Deployment not updating → Push to 'encore' remote, not just 'origin'

# Most Important Files
encore.app               # CORS + service config
CLAUDE.md                # Dev guidelines
llm.txt                  # Encore.ts reference
frontend/vercel.json     # SPA routing (CRITICAL!)
Makefile                 # All commands
```

---

**You're now ready to build features! Start with the Quick Start section and refer back to this guide as needed.**
