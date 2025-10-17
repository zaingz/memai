# Test Data Builders

This directory contains reusable test data builders that simplify test setup by providing a fluent, chainable API for creating test fixtures.

## Why Use Builders?

**Before (manual test data creation):**
```typescript
const userId = randomUUID();
const bookmark = await bookmarkRepo.create({
  user_id: userId,
  url: "https://youtube.com/watch?v=test123",
  title: "Test Video",
  source: BookmarkSource.YOUTUBE,
  client_time: new Date(),
  metadata: null,
});

await transcriptionRepo.createPending(bookmark.id);
await transcriptionRepo.markAsProcessing(bookmark.id);
await transcriptionRepo.updateTranscriptionData(bookmark.id, {
  transcript: "Test transcript",
  deepgramSummary: "Summary",
  sentiment: "positive",
  sentimentScore: 0.8,
  deepgramResponse: {} as any,
  duration: 120,
  confidence: 0.95,
});
await transcriptionRepo.updateSummary(bookmark.id, "AI summary");
```

**After (using builders):**
```typescript
const { bookmark, transcription } = await new TranscriptionBuilder()
  .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube("test123"))
  .asCompleted("Test transcript")
  .build();
```

**Benefits:**
- ✅ Less boilerplate
- ✅ Readable, self-documenting code
- ✅ Sensible defaults
- ✅ Fluent, chainable API
- ✅ Handles complex relationships
- ✅ Reduces test maintenance

## Available Builders

### 1. BookmarkBuilder

Creates bookmarks with various sources and configurations.

**Methods:**
- `forUser(userId: string)` - Set the bookmark owner
- `withUrl(url: string)` - Set custom URL
- `withSource(source: BookmarkSource)` - Set bookmark source
- `asYouTube(videoId?: string)` - Create YouTube bookmark
- `asPodcast(episodeId?: string)` - Create podcast bookmark
- `withoutTitle()` - Create bookmark with null title
- `build()` - Create and return the bookmark

**Examples:**
```typescript
// Simple YouTube bookmark
const bookmark = await new BookmarkBuilder()
  .forUser(userId)
  .asYouTube("dQw4w9WgXcQ")
  .build();

// Podcast bookmark
const bookmark = await new BookmarkBuilder()
  .forUser(userId)
  .asPodcast("ep-456")
  .build();

// Custom bookmark
const bookmark = await new BookmarkBuilder()
  .forUser(userId)
  .withUrl("https://example.com/article")
  .withSource(BookmarkSource.WEB)
  .withoutTitle()
  .build();
```

### 2. TranscriptionBuilder

Creates transcriptions in various states (pending, processing, completed, failed).

**Methods:**
- `forBookmark(bookmarkId: number)` - Use existing bookmark
- `withBookmark(builder: BookmarkBuilder)` - Create bookmark inline
- `asPending()` - Set status to pending
- `asProcessing()` - Set status to processing
- `asCompleted(transcript?: string)` - Set status to completed with transcript
- `asFailed(error?: string)` - Set status to failed
- `build()` - Create and return `{ bookmark, transcription }`

**Examples:**
```typescript
// Completed transcription
const { bookmark, transcription } = await new TranscriptionBuilder()
  .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube())
  .asCompleted("Full transcript text")
  .build();

// Pending transcription
const { bookmark, transcription } = await new TranscriptionBuilder()
  .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube())
  .asPending()
  .build();

// Failed transcription
const { bookmark, transcription } = await new TranscriptionBuilder()
  .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube())
  .asFailed("Transcription timeout")
  .build();

// Use existing bookmark
const existingBookmark = await new BookmarkBuilder().forUser(userId).build();
const { transcription } = await new TranscriptionBuilder()
  .forBookmark(existingBookmark.id)
  .asCompleted()
  .build();
```

### 3. WebContentBuilder

Creates web content extractions in various states.

**Methods:**
- `forBookmark(bookmarkId: number)` - Use existing bookmark
- `withBookmark(builder: BookmarkBuilder)` - Create bookmark inline
- `asCompleted(markdown?: string)` - Set status to completed with content
- `asFailed()` - Set status to failed
- `withWordCount(count: number)` - Set word count
- `build()` - Create and return `{ bookmark, webContent }`

**Examples:**
```typescript
// Completed web content
const { bookmark, webContent } = await new WebContentBuilder()
  .withBookmark(new BookmarkBuilder().forUser(userId))
  .asCompleted("# Article Title\n\nArticle content here.")
  .withWordCount(500)
  .build();

// Failed web content
const { bookmark, webContent } = await new WebContentBuilder()
  .withBookmark(new BookmarkBuilder().forUser(userId))
  .asFailed()
  .build();
```

### 4. DigestBuilder

Creates daily digests for users or global digests.

**Methods:**
- `forUser(userId: string)` - Set user (null for global digest)
- `forDate(date: Date)` - Set digest date
- `asCompleted(content?: string)` - Set status to completed with content
- `asFailed()` - Set status to failed
- `withBookmarkCount(count: number)` - Set number of bookmarks
- `build()` - Create and return the digest

**Examples:**
```typescript
// User's completed digest
const digest = await new DigestBuilder()
  .forUser(userId)
  .forDate(new Date("2025-01-15"))
  .asCompleted("Daily digest content")
  .withBookmarkCount(10)
  .build();

// Global digest
const digest = await new DigestBuilder()
  .forDate(new Date("2025-01-20"))
  .withBookmarkCount(50)
  .build();

// Failed digest
const digest = await new DigestBuilder()
  .forUser(userId)
  .asFailed()
  .build();
```

### 5. UserBuilder

Creates users via direct repository or webhook.

**Methods:**
- `withId(id: string)` - Set user ID (UUID)
- `withEmail(email: string)` - Set email
- `withName(name: string)` - Set name
- `withoutName()` - Set name to null
- `viaWebhook()` - Create via Supabase webhook (sets migrated_to_supabase)
- `build()` - Create and return the user

**Examples:**
```typescript
// Simple user
const user = await new UserBuilder()
  .withEmail("test@example.com")
  .withName("Test User")
  .build();

// User without name
const user = await new UserBuilder()
  .withEmail("noname@example.com")
  .withoutName()
  .build();

// User with specific ID
const user = await new UserBuilder()
  .withId(customId)
  .withEmail("custom@example.com")
  .build();

// User created via webhook
const user = await new UserBuilder()
  .withEmail("webhook@example.com")
  .viaWebhook()
  .build();
```

## Complex Scenarios

### Complete User Workflow

```typescript
// Create user
const user = await new UserBuilder()
  .withEmail("workflow@example.com")
  .withName("Workflow User")
  .build();

// Create YouTube bookmark with completed transcription
const { bookmark: ytBookmark, transcription } = await new TranscriptionBuilder()
  .withBookmark(new BookmarkBuilder().forUser(user.id).asYouTube("video123"))
  .asCompleted("Full YouTube transcript")
  .build();

// Create web bookmark with completed content
const { bookmark: webBookmark, webContent } = await new WebContentBuilder()
  .withBookmark(new BookmarkBuilder().forUser(user.id).withUrl("https://blog.example.com"))
  .asCompleted("# Blog Post\n\nContent here")
  .withWordCount(300)
  .build();

// Create digest for user
const digest = await new DigestBuilder()
  .forUser(user.id)
  .forDate(new Date())
  .asCompleted("User's daily digest")
  .withBookmarkCount(2)
  .build();
```

### Multiple States for Testing

```typescript
const userId = randomUUID();

// Pending transcription
const { bookmark: pending } = await new TranscriptionBuilder()
  .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube("video1"))
  .asPending()
  .build();

// Processing transcription
const { bookmark: processing } = await new TranscriptionBuilder()
  .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube("video2"))
  .asProcessing()
  .build();

// Completed transcription
const { bookmark: completed } = await new TranscriptionBuilder()
  .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube("video3"))
  .asCompleted("Completed transcript")
  .build();

// Failed transcription
const { bookmark: failed } = await new TranscriptionBuilder()
  .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube("video4"))
  .asFailed("Error")
  .build();
```

## Best Practices

1. **Use builders in test setup, not production code**
   - Builders are for tests only
   - Never import builders in source code

2. **Chain methods for readability**
   ```typescript
   // ✅ Good
   const bookmark = await new BookmarkBuilder()
     .forUser(userId)
     .asYouTube("test123")
     .build();

   // ❌ Avoid
   const builder = new BookmarkBuilder();
   builder.forUser(userId);
   builder.asYouTube("test123");
   const bookmark = await builder.build();
   ```

3. **Use sensible defaults**
   - Builders provide defaults for most fields
   - Only customize what matters for your test

4. **Combine builders for relationships**
   ```typescript
   // Create bookmark and transcription together
   const { bookmark, transcription } = await new TranscriptionBuilder()
     .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube())
     .asCompleted()
     .build();
   ```

5. **Keep tests focused**
   - Use builders to quickly set up test context
   - Focus test assertions on behavior being tested

## Testing the Builders

See `test/__tests__/builders.demo.test.ts` for comprehensive usage examples and integration tests.

## Architecture

All builders follow the **Builder Pattern**:
- Fluent, chainable API
- Method chaining returns `this`
- `build()` method creates and persists the object
- Internal use of repositories for database operations
- Sensible defaults for all optional fields

## Contributing

When adding new builders:
1. Create `{entity}.builder.ts` file
2. Implement fluent methods
3. Provide `build()` method
4. Add to `index.ts` exports
5. Document usage in this README
6. Add tests to `builders.demo.test.ts`
