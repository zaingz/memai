# MemAI Backend - Claude Code Instructions

## Project Overview

This is an **Encore.ts backend** for the MemAI application, handling bookmarks with YouTube video transcription using Deepgram (Nova-3) and OpenAI (GPT-4.1-mini).

**Stack:**
- Framework: Encore.ts (TypeScript backend framework)
- Database: PostgreSQL (via Encore's SQLDatabase)
- Transcription: Deepgram API (Nova-3 model with Audio Intelligence)
- AI Summary: OpenAI Responses API (GPT-4.1-mini)
- Pub/Sub: Encore's built-in Pub/Sub for async processing

---

## CRITICAL: Before You Start

### 1. **Always Read `/llm.txt` First**
The `/llm.txt` file contains comprehensive Encore.ts framework knowledge including:
- API endpoint patterns
- Database operations (query, queryRow, exec)
- Pub/Sub implementation
- Service structure
- Error handling patterns
- ALL Encore.ts domain knowledge

**DO NOT write Encore.ts code without consulting `/llm.txt` first!**

### 2. **Use All Available Tools**
**NEVER assume or guess.** Always:
- ✅ Use `Read` to check existing files before creating new ones
- ✅ Use `Glob` to find files by pattern (`**/*.ts`, etc.)
- ✅ Use `Grep` to search for code usage, types, patterns
- ✅ Use `WebSearch` to research APIs, best practices, latest docs
- ✅ Use `WebFetch` to get official documentation
- ✅ Use `Bash` to verify structure, check databases, run tests

### 3. **When Unclear: Research, Don't Guess**
If requirements are ambiguous:
1. **Ask clarifying questions**
2. **Search for documentation** (WebSearch/WebFetch)
3. **Check existing code** (Read/Grep for patterns)
4. **Verify assumptions** (test with Bash commands)
5. **Make a plan, then execute**

---

## Common Bash Commands

```bash
# Development
encore run                    # Start the dev server
encore run --debug           # Start with debugging enabled

# Database
encore db conn-uri bookmarks # Get database connection string
encore db shell bookmarks    # Open psql shell
encore db reset bookmarks    # Reset database (careful!)
psql "$(encore db conn-uri bookmarks)" -c "\d transcriptions"  # Check schema

# Type checking
npx tsc --noEmit            # Check TypeScript types

# Project structure
tree bookmarks -L 2 -I 'node_modules'  # View directory structure
ls -la bookmarks/           # List files in bookmarks service

# Git
git status                  # Check current state
git diff                    # View changes
```

---

## Framework: Encore.ts Essentials

### ⚠️ Reference `/llm.txt` for Complete Framework Knowledge

**Key Points from `/llm.txt`:**

#### Database Operations (ONLY these methods exist)
```typescript
// ✅ CORRECT - From llm.txt
const row = await db.queryRow<Type>`SELECT * FROM table WHERE id = ${id}`;
const rows = await db.query<Type>`SELECT * FROM table`;
await db.exec`INSERT INTO table (field) VALUES (${value})`;

// ❌ WRONG - These don't exist in Encore
db.all()   // NO
db.get()   // NO
db.run()   // NO
```

#### API Endpoint Pattern
```typescript
import { api, APIError } from "encore.dev/api";

export const endpoint = api(
  { expose: true, method: "POST", path: "/resource" },
  async (req: RequestType): Promise<ResponseType> => {
    if (!req.required) {
      throw APIError.invalidArgument("field required");
    }
    return { data };
  }
);
```

#### Pub/Sub Pattern
```typescript
import { Topic, Subscription } from "encore.dev/pubsub";

// Topic (package-level variable)
export const topic = new Topic<EventType>("topic-name", {
  deliveryGuarantee: "at-least-once",
});

// Subscription (use _ for unused variable)
const _ = new Subscription(topic, "handler-name", {
  handler: async (event) => { /* logic */ },
});
```

---

## Project Architecture

### Service Structure
```
bookmarks/
├── encore.service.ts    # Service registration (imports processors!)
├── api.ts              # REST API endpoints
├── db.ts               # Database initialization
├── events/             # Pub/Sub topics (multi-stage pipeline)
│   ├── youtube-download.events.ts        # Stage 1: YouTube download
│   ├── audio-transcription.events.ts     # Stage 2: Audio transcription
│   └── summary-generation.events.ts      # Stage 3: Summary generation
├── types/              # Organized type definitions
│   ├── domain.types.ts      # Core domain models
│   ├── api.types.ts         # API request/response types
│   ├── event.types.ts       # Pub/Sub event types
│   ├── deepgram.types.ts    # Deepgram API types
│   └── index.ts             # Re-exports
├── config/             # Centralized configuration
│   └── transcription.config.ts
├── repositories/       # Database access ONLY
│   ├── bookmark.repository.ts
│   └── transcription.repository.ts
├── services/           # Business logic
│   ├── youtube-downloader.service.ts
│   ├── deepgram.service.ts
│   └── openai.service.ts
├── processors/         # Pub/Sub handlers (multi-stage pipeline)
│   ├── youtube-download.processor.ts         # Stage 1
│   ├── audio-transcription.processor.ts      # Stage 2
│   └── summary-generation.processor.ts       # Stage 3
├── utils/             # Pure utility functions
│   ├── youtube-url.util.ts
│   ├── file-cleanup.util.ts
│   └── deepgram-extractor.util.ts
└── migrations/        # SQL migrations (numbered)
    ├── 1_create_bookmarks.up.sql
    ├── 2_create_transcriptions.up.sql
    ├── 3_add_audio_intelligence.up.sql
    └── 4_add_audio_metadata.up.sql
```

### Architecture Principles

**1. Single Responsibility**
- One file = One purpose
- Repositories: Database operations ONLY
- Services: Business logic, use repositories
- Processors: Pub/Sub handlers, coordinate services
- Utils: Pure functions, no side effects

**2. Dependency Injection**
```typescript
// ✅ GOOD: Injectable
class Service {
  constructor(
    private readonly repo: Repository,
    private readonly api: ExternalAPI
  ) {}
}

// ❌ BAD: Hard-coded
class Service {
  private repo = new Repository(); // Not testable
}
```

**3. Centralized Configuration**
```typescript
// config/feature.config.ts
export const CONFIG = {
  model: "gpt-4.1-mini" as const,
  timeout: 30000,
} as const;

// ❌ NEVER hardcode in services
```

### Multi-Stage Pub/Sub Pipeline

**Architecture:** YouTube transcription uses a 3-stage pipeline for fault tolerance and data persistence at each step.

**Flow:**
```
API creates bookmark
  ↓
  Publish YouTubeDownloadEvent
  ↓
Stage 1: YouTube Download Processor
  - Downloads audio from YouTube to temp file
  - Uploads to Encore Object Storage bucket
  - Deletes temp file
  - Publishes AudioTranscriptionEvent (with bucket key)
  ↓
Stage 2: Audio Transcription Processor
  - Downloads audio from bucket
  - Transcribes with Deepgram
  - Stores transcript + metadata in DB
  - Deletes audio from bucket
  - Publishes SummaryGenerationEvent
  ↓
Stage 3: Summary Generation Processor
  - Generates OpenAI summary
  - Stores summary in DB
  - Marks transcription as completed
```

**Benefits:**
- ✅ **Fault Isolation**: Each stage can fail independently without losing previous work
- ✅ **Object Storage**: Uses Encore Bucket instead of temp files (cloud-ready, distributed-safe)
- ✅ **Data Persistence**: Each stage writes its data immediately to DB
- ✅ **Retry Safety**: Can retry any stage without redoing previous stages
- ✅ **Observability**: Can track which stage failed and why
- ✅ **Scalability**: Can scale each stage independently
- ✅ **Automatic Cleanup**: Audio files deleted from bucket after transcription

**Example: Stage 1 Processor (with Encore Bucket)**
```typescript
import { Subscription } from "encore.dev/pubsub";
import { youtubeDownloadTopic } from "../events/youtube-download.events";
import { audioTranscriptionTopic } from "../events/audio-transcription.events";
import { audioFilesBucket } from "../storage";

async function handleYouTubeDownload(event: YouTubeDownloadEvent) {
  try {
    // Download audio and upload to bucket
    const audioBucketKey = await youtubeDownloader.downloadAndUpload(
      videoId,
      bookmarkId
    );

    // Publish to next stage with bucket key
    await audioTranscriptionTopic.publish({
      bookmarkId,
      audioBucketKey, // Pass bucket key instead of file path
      videoId,
    });
  } catch (error) {
    await transcriptionRepo.markAsFailed(bookmarkId, error.message);
  }
}

export const youtubeDownloadSubscription = new Subscription(
  youtubeDownloadTopic,
  "youtube-download-processor",
  { handler: handleYouTubeDownload }
);
```

**Example: Stage 2 Processor (downloads from bucket)**
```typescript
async function handleAudioTranscription(event: AudioTranscriptionEvent) {
  const { bookmarkId, audioBucketKey, videoId } = event;

  try {
    // Download from bucket
    const audioBuffer = await audioFilesBucket.download(audioBucketKey);

    // Transcribe
    const deepgramResponse = await deepgramService.transcribe(
      audioBuffer,
      audioBucketKey
    );

    // Store data
    await transcriptionRepo.updateTranscriptionData(bookmarkId, data);

    // Delete from bucket
    await audioFilesBucket.remove(audioBucketKey);

    // Publish next stage
    await summaryGenerationTopic.publish({ bookmarkId, transcript });
  } catch (error) {
    // Clean up bucket on failure
    try {
      await audioFilesBucket.remove(audioBucketKey);
    } catch {}
    await transcriptionRepo.markAsFailed(bookmarkId, error.message);
  }
}
```

**Key Patterns:**
- **Object Storage**: Use Encore Bucket for temp audio files (not filesystem)
- **Each processor**: Process → Store Data → Cleanup → Publish Next Event
- **Each stage is idempotent**: Safe to retry without side effects
- **Automatic cleanup**: Audio deleted from bucket after Stage 2 completes
- **Bucket keys**: Format: `audio-{bookmarkId}-{videoId}.mp3`

---

## Deepgram Integration

### ⚠️ CRITICAL: Deepgram Uses PLURAL Keys

```typescript
// ❌ WRONG - This key doesn't exist!
response.results.sentiment

// ✅ CORRECT - Note the 's' at the end
response.results.sentiments
response.results.intents
response.results.topics
response.results.summary
```

### Configuration (config/transcription.config.ts)
```typescript
export const DEEPGRAM_CONFIG = {
  model: "nova-3" as const,        // Latest model (2025)
  smart_format: true,
  paragraphs: true,
  punctuate: true,
  diarize: true,
  sentiment: true,                  // Enable sentiment analysis
  summarize: "v2" as const,        // Use V2 summarization
  intents: true,                    // Enable intent recognition
  topics: true,                     // Enable topic detection
  language: "en" as const,         // Required for audio intelligence
} as const;
```

### Service Pattern
```typescript
export class DeepgramService {
  constructor(private readonly apiKey: string) {}

  async transcribe(audioPath: string): Promise<DeepgramResponse> {
    const deepgram = createClient(this.apiKey);
    const audioBuffer = fs.readFileSync(audioPath);

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      DEEPGRAM_CONFIG
    );

    if (error) {
      throw new Error(`Deepgram API error: ${error.message}`);
    }

    // Cast to custom type with audio intelligence
    return result as unknown as DeepgramResponse;
  }
}
```

### Data Extraction
```typescript
// ✅ Access PLURAL keys with fallbacks
const sentiment = response.results.sentiments?.average?.sentiment || null;
const sentimentScore = response.results.sentiments?.average?.sentiment_score || null;
const summary = response.results.summary?.short || null;
```

**Resources:**
- Docs: https://developers.deepgram.com/docs/
- Model: Nova-3 (2025)
- Features: Sentiment, Summarization V2, Intents, Topics

---

## OpenAI Integration

### ⚠️ Use Responses API (Not Chat Completions)

```typescript
// ✅ CORRECT: Responses API (2025 standard)
import OpenAI from "openai";

const openai = new OpenAI({ apiKey });

const response = await openai.responses.create({
  model: "gpt-4.1-mini",
  instructions: "System prompt here",
  input: "User input here",
  temperature: 0.7,
  max_output_tokens: 500,
});

const text = response.output_text;

// ❌ WRONG: Old Chat Completions API
const response = await openai.chat.completions.create({ ... });
```

### Configuration (config/transcription.config.ts)
```typescript
export const OPENAI_CONFIG = {
  model: "gpt-4.1-mini" as const,
  temperature: 0.7,
  maxOutputTokens: 500,
  instructions: "You are a helpful assistant...",
} as const;
```

### Service Pattern
```typescript
export class OpenAIService {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateSummary(transcript: string): Promise<string> {
    try {
      const response = await this.client.responses.create({
        model: OPENAI_CONFIG.model,
        instructions: OPENAI_CONFIG.instructions,
        input: `Summarize: ${transcript}`,
        temperature: OPENAI_CONFIG.temperature,
        max_output_tokens: OPENAI_CONFIG.maxOutputTokens,
      });

      return response.output_text || "No summary available";
    } catch (error) {
      log.error(error, "OpenAI summary generation failed");
      throw new Error(`OpenAI error: ${error.message}`);
    }
  }
}
```

**Resources:**
- Docs: https://platform.openai.com/docs/api-reference/responses
- Model: GPT-4.1-mini (2025)
- API: Responses API (new standard)

---

## Database Best Practices

### 1. Repository Pattern (Always)
```typescript
export class FeatureRepository {
  constructor(private readonly db: SQLDatabase) {}

  async create(data: Data): Promise<Entity> {
    const row = await this.db.queryRow<Entity>`
      INSERT INTO table (field) VALUES (${data.field})
      RETURNING *
    `;
    if (!row) throw new Error("Failed to create");
    return row;
  }

  async findById(id: number): Promise<Entity | null> {
    return await this.db.queryRow<Entity>`
      SELECT * FROM table WHERE id = ${id}
    ` || null;
  }

  async list(): Promise<Entity[]> {
    const results: Entity[] = [];
    for await (const row of this.db.query<Entity>`SELECT * FROM table`) {
      results.push(row);
    }
    return results;
  }
}
```

### 2. ⚠️ JSONB Handling
```typescript
// ❌ WRONG: Double-stringification
deepgram_response = ${JSON.stringify(data)}

// ✅ CORRECT: Let Encore handle it
deepgram_response = ${data}  // Encore auto-serializes to JSONB
```

### 3. Migrations
- Number sequentially: `1_`, `2_`, `3_`
- Descriptive names
- Must end with `.up.sql`
- Place in service's `migrations/` directory
- Applied automatically by Encore on startup

---

## Code Quality Standards

### 1. No Dead Code
```typescript
// ❌ BAD
const unused = [];  // Never used

// ✅ GOOD
// Only declare what you use
```

### 2. Error Messages
```typescript
// ❌ BAD
throw new Error("Error");

// ✅ GOOD
throw new Error(`Failed to transcribe ${audioPath}: file not found`);
throw APIError.notFound(`Bookmark ${id} not found`);
```

### 3. Structured Logging
```typescript
import log from "encore.dev/log";

// ✅ GOOD
log.info("Processing bookmark", { bookmarkId, url });
log.error(error, "Process failed", { bookmarkId, error: error.message });

// ❌ BAD
console.log("Processing...");
```

### 4. File Naming
```typescript
// ✅ GOOD
feature.repository.ts
feature.service.ts
feature.types.ts
feature.config.ts

// ❌ BAD
FeatureRepository.ts  // No PascalCase
feature_repository.ts // No snake_case
featureRepo.ts        // No abbreviations
```

### 5. Type Safety
```typescript
// ✅ GOOD
type Status = "pending" | "processing" | "completed" | "failed";

// ❌ BAD
type Status = string;  // Too generic
data: any;             // Never use 'any'
```

---

## Common Pitfalls & Solutions

### 1. Deepgram Keys
```typescript
// ❌ WRONG
response.results.sentiment  // Doesn't exist

// ✅ CORRECT
response.results.sentiments // Note the 's'
```

### 2. JSONB Serialization
```typescript
// ❌ WRONG
deepgram_response = ${JSON.stringify(data)} // Double-stringified

// ✅ CORRECT
deepgram_response = ${data} // Auto-serialized
```

### 3. Database Methods
```typescript
// ❌ WRONG - These don't exist
db.get(), db.all(), db.run()

// ✅ CORRECT - From llm.txt
db.queryRow(), db.query(), db.exec()
```

### 4. Service Registration
```typescript
// ❌ WRONG - Processor not imported
// File exists but not loaded

// ✅ CORRECT - Import in encore.service.ts
import "./processors/feature.processor";
```

### 5. Type Casting
```typescript
// ❌ WRONG
source: req.source // Type error: string vs enum

// ✅ CORRECT
source: req.source as BookmarkSource | undefined
```

---

## Workflow: Making Changes

### Step 1: Gather Context
```bash
# Read existing files
Read bookmarks/api.ts

# Search for patterns
Grep "queryRow" bookmarks/

# Check structure
tree bookmarks -L 2

# Consult llm.txt
Read llm.txt
```

### Step 2: Plan
- What files need changes?
- What dependencies are affected?
- Do types need updating?
- Are there database changes?
- Will this break existing code?

### Step 3: Implement
- Follow established patterns
- Use existing utilities
- Maintain consistency
- Add proper logging
- Handle errors gracefully

### Step 4: Validate
```bash
# Type check
npx tsc --noEmit

# Check structure
tree bookmarks

# Test database
psql "$(encore db conn-uri bookmarks)" -c "\d table_name"

# Run server
encore run
```

### Step 5: Document
```typescript
/**
 * Transcribes audio using Deepgram Nova-3
 * @param audioPath - Path to audio file
 * @returns Transcription with audio intelligence
 * @throws Error if transcription fails
 */
```

---

## Code Style

### TypeScript
- Use ES6+ syntax (import/export, not require)
- Use `interface` for object shapes
- Use `type` for unions, intersections, primitives
- Prefer const over let
- Use async/await, not callbacks/promises.then()

### Imports
```typescript
// ✅ GOOD: Centralized imports
import { Type1, Type2 } from "./types";

// ❌ BAD: Scattered imports
import { Type1 } from "./types/domain.types";
import { Type2 } from "./types/api.types";
```

### Error Handling
```typescript
try {
  const result = await operation();
  log.info("Success", { context });
  return result;
} catch (error) {
  log.error(error, "Operation failed", { context });
  throw new Error(`Failed: ${error.message}`);
}
```

---

## Testing

### Encore.ts Testing Workflow

**Core Principle**: Always run tests via `encore test` (never direct vitest). Encore provisions optimized test databases with fsync disabled and in-memory filesystem for fast integration tests.

#### Setup Requirements

1. **vitest.config.ts** - Encore alias and parallel settings
```typescript
export default defineConfig({
  resolve: {
    alias: {
      "~encore": path.resolve(__dirname, "./encore.gen"),
    },
  },
  test: {
    fileParallelism: false,  // Required for DB tests locally
    environment: "node",
    globals: true,
  },
});
```

2. **package.json** - Test script
```json
{
  "scripts": {
    "test": "vitest"
  }
}
```

3. **Running Tests**
```bash
# Local (uses fileParallelism: false from config)
encore test

# CI (override for speed)
encore test --fileParallelism=true

# Specific files
encore test bookmarks/__tests__/bookmark.repository.test.ts
```

#### How to Write Tests

**Call endpoints directly** (no HTTP required):
```typescript
import { createBookmark, getBookmark } from "./api";

it("should create and fetch bookmark", async () => {
  const created = await createBookmark({ url, source, client_time });
  const fetched = await getBookmark({ id: created.id });
  expect(fetched.url).toBe(url);
});
```

**Service-to-service calls with auth override**:
```typescript
import { usersTestClient } from "~encore/clients";

it("should return user profile", async () => {
  // Setup test data via repository
  await userRepo.create({ id, email, name });

  // Call service with auth override
  const result = await usersTestClient.me(
    undefined,  // No request body
    {
      authData: { userID: id, email }  // Override auth
    }
  );

  expect(result.user.email).toBe(email);
});
```

**Mock external dependencies** (APIs, etc.):
```typescript
// At top of test file, before imports
vi.mock("@deepgram/sdk", () => ({
  createClient: vi.fn(() => ({
    listen: {
      prerecorded: {
        transcribeFile: mockTranscribeFile,
      },
    },
  })),
}));
```

#### Testing Best Practices

1. **Never mock Encore primitives globally** (log, database, etc.)
   - Mock only in specific tests that need to verify behavior
   - Use `vi.hoisted()` for test-specific mocks

2. **Databases are automatic**
   - Encore creates optimized test databases automatically
   - Migrations applied automatically
   - No manual setup needed

3. **Pub/Sub Testing**
   - Unit test: Export handler and call directly
   - Integration: Mock topic.publish() calls
   - Test processor logic, not Encore's pub/sub system

4. **Secrets in Tests**
   - Set via `encore secret set --type local Key`
   - Or use `.secrets.local.cue` file
   - Encore validates secrets exist before tests run

5. **VS Code Integration**
   - Set `"vitest.commandLine": "encore test"` in settings.json
   - Provide `ENCORE_RUNTIME_LIB` in `vitest.nodeEnv` if needed

#### CI Configuration

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: encore test --fileParallelism=true

# With coverage
- name: Run tests with coverage
  run: encore test --fileParallelism=true --coverage
```

### ⚠️ CRITICAL: Test Architecture Principles

**See `users/__tests__/TESTING_ARCHITECTURE.md` for complete testing guide.**

### Test Layer Separation (MUST FOLLOW)

Encore.ts has **transaction isolation** in test mode. Each service call runs in its own isolated transaction. This means:

```typescript
// ❌ WRONG - This will FAIL due to transaction isolation
await userRepo.create({ id, email });  // Transaction A
const result = await userApi.getMe(token);  // Transaction B (can't see A)
// Result: 404 - user not found!

// ✅ CORRECT - Stay at one layer
// Option 1: All DB operations
await userRepo.create({ id, email });
const found = await userRepo.findById(id);  // Same transaction, works!

// Option 2: All service calls
await webhookApi.userCreated(payload);  // Service call commits
const result = await userApi.getMe(token);  // Service call sees committed data
```

### Test Layers (Organized by Responsibility)

**Layer 1: Repository Tests** - Database operations only
```typescript
// users/__tests__/user.repository.test.ts
describe("UserRepository", () => {
  it("should create and find user", async () => {
    const user = await userRepo.create({ id, email, name });
    const found = await userRepo.findById(id);
    expect(found).toBeDefined();
  });
});
```
✅ **Pattern**: All DB operations (no service calls)
✅ **Purpose**: Test data access layer

**Layer 2: Webhook Tests** - External integration points
```typescript
// users/__tests__/webhooks.test.ts
describe("Webhook: userCreated", () => {
  it("should sync user from Supabase", async () => {
    const payload = createSupabasePayload({ id, email });
    const response = await webhookApi.userCreated(payload);

    expect(response.claims.local_db_synced).toBe(true);
    const user = await userRepo.findById(id);
    expect(user).toBeDefined();
  });
});
```
✅ **Pattern**: Test the webhook endpoint itself
✅ **Purpose**: Test integration with external systems (Supabase)
❌ **NEVER**: Use webhooks to set up other tests (they're not test helpers!)

**Layer 3: API Handler Tests** - Business logic
```typescript
// users/__tests__/api-handlers.test.ts
describe("API Handlers", () => {
  it("should return user profile", async () => {
    // Setup: Direct DB write (test fixture)
    await userRepo.create({ id, email, name });

    // Test: Call handler with mock auth
    const token = await generateTestJWT(id, email);
    const result = await usersTestClient.me(
      undefined,
      createAuthOpts(token)
    );

    expect(result.user.email).toBe(email);
  });
});
```
✅ **Pattern**: DB setup + service call for testing
✅ **Purpose**: Test API business logic
✅ **Key**: Use `createAuthOpts()` to pass auth context

**Layer 4: E2E Tests** - Critical production flows (minimal)
```typescript
// users/__tests__/e2e.test.ts
describe("E2E: User Lifecycle", () => {
  it("should handle signup → profile → update flow", async () => {
    // Simulate Supabase webhook
    await webhookApi.userCreated(payload);

    // User logs in and fetches profile
    const token = await generateTestJWT(id, email);
    const profile = await userApi.getMe(token);

    // User updates profile
    await userApi.updateMe({ name: "New" }, token);

    // Verify persistence
    const updated = await userApi.getMe(token);
    expect(updated.data.user.name).toBe("New");
  });
});
```
✅ **Pattern**: All service calls (webhook → API)
✅ **Purpose**: Test complete production workflows
✅ **Key**: Keep minimal (3-5 tests), test critical flows only

### Critical Testing Rules

**1. Never Mix Layers**
```typescript
// ❌ WRONG: Mixing DB and service calls
await userRepo.create({ ... });  // DB operation
await userApi.getMe(token);      // Service call
// → Transaction isolation breaks this!

// ✅ CORRECT: Stay at one layer
await userRepo.create({ ... });  // DB operation
await userRepo.findById(id);     // DB operation
```

**2. Webhooks Are NOT Test Helpers**
```typescript
// ❌ WRONG: Using webhook for API test setup
await webhookApi.userCreated(payload);  // External integration
await userApi.updateMe({ name }, token);  // Testing API logic
// → Conflates concerns

// ✅ CORRECT: Use direct DB for API test setup
await userRepo.create({ id, email });  // Test fixture
await userApi.updateMe({ name }, token);  // Testing API logic
```

**3. Each Test Layer Has ONE Purpose**
- Repository tests → Test data access
- Webhook tests → Test external integrations
- API Handler tests → Test business logic
- E2E tests → Test critical workflows

### Running Tests

```bash
# Run all tests
encore test

# Run specific service tests
encore test users/__tests__/
encore test bookmarks/__tests__/

# Run specific test file
encore test users/__tests__/user.repository.test.ts
encore test users/__tests__/api-handlers.test.ts

# Type check before testing
npx tsc --noEmit
```

### Before Committing

1. ✅ Run `npx tsc --noEmit` - Check TypeScript types
2. ✅ Run `encore test` - Verify all tests pass
3. ✅ Run `encore run` - Verify server starts
4. ✅ Check logs for warnings
5. ✅ Verify migrations apply cleanly

### Manual Testing

```bash
# Create a bookmark
curl -X POST http://localhost:4000/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtube.com/watch?v=VIDEO_ID",
    "source": "youtube",
    "client_time": "2025-01-01T00:00:00Z"
  }'

# Check transcription status
psql "$(encore db conn-uri bookmarks)" -c "
  SELECT id, status, sentiment, sentiment_score
  FROM transcriptions
  ORDER BY created_at DESC
  LIMIT 5;
"

# Test user API
TOKEN="your-jwt-token"
curl -X GET http://localhost:4000/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Common Testing Mistakes

**Mistake 1**: Using webhooks for API test setup
```typescript
// ❌ WRONG
await webhookApi.userCreated(payload);  // Webhook is external integration
const response = await userApi.updateMe({ name }, token);

// ✅ CORRECT
await userRepo.create({ id, email });  // Direct DB fixture
const response = await userApi.updateMe({ name }, token);
```

**Mistake 2**: Mixing DB writes with service calls
```typescript
// ❌ WRONG - Transaction isolation
await userRepo.create({ id, email });  // Transaction A
const result = await userApi.getMe(token);  // Transaction B (404!)

// ✅ CORRECT - Stay at one layer
await userRepo.create({ id, email });
const found = await userRepo.findById(id);  // Same transaction
```

**Mistake 3**: Too many E2E tests
```typescript
// ❌ WRONG - E2E for every scenario
describe("E2E", () => {
  it("test scenario 1", ...);
  it("test scenario 2", ...);
  it("test scenario 3", ...);
  // ... 20 more tests
});

// ✅ CORRECT - E2E for critical flows only
describe("E2E", () => {
  it("complete user lifecycle", ...);  // Critical flow
  it("webhook idempotency", ...);      // Critical flow
  it("auth failures", ...);            // Critical flow
  // Keep to 3-5 tests
});
```

---

## Key Reminders

1. **Read `/llm.txt` first** - Contains all Encore.ts patterns
2. **Use all available tools** - Don't guess, verify
3. **Multi-stage pipeline** - YouTube processing uses 3-stage Pub/Sub for fault tolerance
4. **Deepgram uses plural keys** - `sentiments`, `intents`, `topics`
5. **OpenAI Responses API** - Not Chat Completions
6. **JSONB auto-serializes** - No `JSON.stringify()` needed
7. **Repositories are simple** - Database operations only
8. **Each stage persists data** - Store results immediately before publishing next event
9. **Config is centralized** - Never hardcode
10. **Types are organized** - Separate domain/API/external/events
11. **One file, one job** - Single Responsibility always
12. **Test layer separation** - Never mix DB writes with service calls (transaction isolation)
13. **Webhooks are integration points** - NOT test helpers
14. **Each test layer has ONE purpose** - Repository, Webhook, API Handler, E2E

---

## When to Use Which Tool

- **Read**: Check existing files, understand current implementation
- **Glob**: Find files by pattern (`**/*.ts`, `**/migrations/*.sql`)
- **Grep**: Search for usage, patterns across codebase
- **WebSearch**: Research APIs, check for updates, find best practices
- **WebFetch**: Get official documentation, API references
- **Bash**: Verify structure, check database, run type checks

---

## Emergency Debugging

### Server won't start
```bash
encore daemon restart    # Restart Encore daemon
encore run --debug      # Run with debugging
```

### Database issues
```bash
encore db reset bookmarks        # Reset database
encore db shell bookmarks        # Open psql shell
```

### Type errors
```bash
npx tsc --noEmit | grep bookmarks  # Check TypeScript errors
```

### Check logs
```bash
encore logs --env=local     # View application logs
```

---

## Resources

- **Encore.ts Docs**: https://encore.dev/docs/ts
- **Deepgram Docs**: https://developers.deepgram.com/docs/
- **OpenAI Responses API**: https://platform.openai.com/docs/api-reference/responses
- **Project llm.txt**: `/llm.txt` (ALWAYS reference this first!)

---

## Summary: Golden Rules

✅ **DO:**
- Read `/llm.txt` before coding Encore.ts features
- Use all available tools (Read, Grep, Glob, WebSearch, etc.)
- Follow established patterns in existing code
- Verify assumptions with tools, never guess
- Write modular code (SRP, DI, centralized config)
- Use structured logging with context
- Handle errors gracefully with specific messages
- Type everything properly, avoid `any`

❌ **DON'T:**
- Skip reading existing code before changes
- Assume API structure without checking
- Hardcode configuration values
- Use deprecated APIs (Chat Completions, etc.)
- Double-stringify JSONB fields
- Mix concerns (business logic in repositories)
- Leave dead code or unused variables
- Use generic error messages
- Mix DB writes with service calls in tests (transaction isolation!)
- Use webhooks as test helpers (they're external integrations)
- Write too many E2E tests (keep to 3-5 critical flows)

**Remember**: Quality over speed. Understand first, code second. Use tools to verify everything.
