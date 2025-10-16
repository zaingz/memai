# Gemini API Setup Guide

This guide will help you set up the Gemini API correctly for YouTube video transcription.

## Problem You Were Facing

The errors you saw (`401 Unauthorized - API keys are not supported`) happened because:
1. We were using a **deprecated SDK** (`@google/generative-ai`)
2. The old SDK might have been using the wrong authentication method
3. You might have been using a Google Cloud API key instead of a Google AI Studio API key

## What We Fixed

✅ **Migrated to new SDK**: Updated from `@google/generative-ai` (deprecated) to `@google/genai` (v1.25.0)
✅ **Updated authentication**: Now using the correct `x-goog-api-key` header format
✅ **Created test script**: Added `test-gemini-api.sh` to validate your API key works
✅ **Removed yt-dlp fallback**: YouTube now uses **Gemini ONLY** (simpler, faster, cheaper)

---

## Step 1: Get the Correct API Key

**IMPORTANT**: You need an API key from **Google AI Studio**, NOT Google Cloud Console.

### Option A: Create New API Key (Recommended)

1. Go to https://aistudio.google.com/apikey
2. Click "Create API key"
3. Select "Create API key in new project" (or use existing project)
4. Copy the API key (starts with `AIza...`)

### Option B: Use Existing Key

1. Go to https://aistudio.google.com/apikey
2. Find your existing key
3. Click "Copy" to copy the full API key

**What the key should look like:**
```
AIzaSyD...your_key_here...abcd1234
```

**Length**: ~39 characters
**Starts with**: `AIza`

---

## Step 2: Test Your API Key

Before configuring Encore, test that your API key works:

```bash
# Make the test script executable (if not already)
chmod +x test-gemini-api.sh

# Run the test with your API key
./test-gemini-api.sh AIzaSyD_YOUR_API_KEY_HERE
```

**Expected output:**
```
🧪 Testing Gemini API with your key...
📝 Test 1: Simple text generation
✅ SUCCESS: API key works for text generation!

📺 Test 2: YouTube video transcription
✅ SUCCESS: YouTube transcription works!

🎉 All tests passed! Your API key is configured correctly.
```

**If tests fail**, you'll see specific error messages guiding you to fix the issue.

---

## Step 3: Configure Encore Secret

Once your API key is validated, set it in Encore:

```bash
# Set the secret for local development
encore secret set --type local GeminiApiKey
```

When prompted, paste your API key (the full `AIza...` string).

**Verify it's set:**
```bash
encore secret list | grep Gemini
```

You should see:
```
GeminiApiKey    ✓    (shows checkmark for local)
```

---

## Step 4: Restart Encore

```bash
# Stop current server (if running)
pkill -f "encore run"

# Start fresh
encore run
```

**Look for this log message:**
```
Initializing Gemini service apiKeyLength=39 apiKeyPreview=AIza...1234 sdkVersion="@google/genai v1.25.0"
```

This confirms:
- ✅ API key is being loaded
- ✅ Key has correct length
- ✅ Using the new SDK

---

## Step 5: Test YouTube Transcription

### Option A: Via Auth UI

1. Open the auth UI:
   ```bash
   open auth-ui.html
   ```

2. Click "Initialize Supabase" (credentials pre-filled)

3. Sign up or sign in to get a JWT token

4. Create a bookmark with a YouTube URL:
   ```bash
   curl -X POST http://localhost:4000/bookmarks \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
       "source": "youtube",
       "client_time": "2025-01-15T00:00:00Z"
     }'
   ```

5. Check the logs:
   ```bash
   tail -f /tmp/encore-run.log | grep -i "gemini\|transcription"
   ```

### What Success Looks Like

```
Starting Gemini transcription videoId=dQw4w9WgXcQ
Gemini transcription successful transcriptLength=1234 processingTime=25000
Published audio-transcribed event bookmarkId=1
```

### What Failure Looks Like

**Private Video:**
```
❌ Gemini transcription failed: Private video
```

**Quota Exceeded:**
```
❌ Gemini transcription failed: Rate limit exceeded
```

**Invalid Key:**
```
❌ Gemini transcription failed: API key invalid
```

---

## Troubleshooting

### Error: "API keys are not supported"

**Cause**: You're using a Google Cloud API key instead of Google AI Studio key.

**Fix**:
1. Go to https://aistudio.google.com/apikey
2. Create a new key from Google AI Studio (NOT Cloud Console)
3. Update the Encore secret with the new key

---

### Error: "Method doesn't allow unregistered callers"

**Cause**: API key is empty or malformed.

**Fix**:
1. Check key starts with `AIza`
2. Check key is ~39 characters long
3. Make sure you copied the entire key (no spaces or quotes)
4. Run `./test-gemini-api.sh YOUR_KEY` to verify

---

### Error: "Private video" or "Video unavailable"

**Cause**: Gemini can only access public YouTube videos.

**Fix**: Use a different video URL that is:
- ✅ Public (not unlisted or private)
- ✅ Less than 2 hours long
- ✅ Available in your region

---

### Error: "Rate limit exceeded" or "Quota exceeded"

**Cause**: Free tier has limits:
- 8 hours of YouTube video per day
- 15 requests per minute

**Fix**:
- Wait 24 hours for quota reset
- Or upgrade to paid tier for higher limits

---

### Error: Still getting authentication errors after following all steps

**Nuclear option - Create fresh API key:**

1. Go to https://aistudio.google.com/apikey
2. Click "Create API key"
3. Select "Create API key in **NEW project**"
4. Copy the new key
5. Test it immediately:
   ```bash
   ./test-gemini-api.sh YOUR_NEW_KEY
   ```
6. If test passes, update Encore:
   ```bash
   encore secret set --type local GeminiApiKey
   ```

---

## How It Works Now (Gemini ONLY)

```
User creates YouTube bookmark
     ↓
Extract video ID
     ↓
Call Gemini API with YouTube URL
     ↓
   SUCCESS → Store transcript → Publish event ✅
   FAILURE → Mark as failed ❌ (no fallback)
```

**Benefits:**
- ⚡ Fast: ~30 seconds vs 2-5 minutes
- 💰 Cheap: $0.02-0.05/hour vs $0.10+/hour
- 🎯 Simple: One API call vs multi-stage pipeline

**Trade-off:**
- Private/restricted videos will fail (no yt-dlp fallback)
- Most content is public, so this is acceptable

---

## Additional Resources

- **Google AI Studio**: https://aistudio.google.com/
- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **Video Understanding**: https://ai.google.dev/gemini-api/docs/video-understanding
- **SDK Documentation**: https://googleapis.github.io/js-genai/

---

## Summary Checklist

Before asking for help, verify:

- [ ] API key is from Google AI Studio (not Google Cloud)
- [ ] API key starts with `AIza` and is ~39 characters
- [ ] Test script passes (`./test-gemini-api.sh YOUR_KEY`)
- [ ] Secret is set in Encore (`encore secret list`)
- [ ] Server shows Gemini initialization log
- [ ] Testing with a PUBLIC YouTube video

If all checkboxes are ✅ and it still doesn't work, then we can debug further.
