# Quick Reference Guide

Fast reference for common MemAI Backend operations.

---

## 🚀 Quick Start (3 Steps)

```bash
# 1. Set up secrets
encore secret set --type local DeepgramAPIKey
encore secret set --type local OpenAIAPIKey
encore secret set --type local FirecrawlAPIKey
encore secret set --type local SupabaseJWTSecret

# 2. Start server
encore run

# 3. Create a test bookmark
curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtu.be/VIDEO_ID","source":"youtube"}'
```

---

## 📝 Common Commands

### Server Management

```bash
# Start development server
encore run

# Start with debugging
encore run --debug

# Restart daemon
encore daemon restart

# View logs
# Logs appear in the terminal where `encore run` is running
```

### Database Operations

**Note**: MemAI uses TWO databases: `users` and `bookmarks`

```bash
# List all databases
encore db list

# Get database connection strings
encore db conn-uri users
encore db conn-uri bookmarks

# Open database shell
encore db shell bookmarks

# Reset database (CAUTION: deletes all data)
encore db reset bookmarks

# Run SQL query
psql "$(encore db conn-uri bookmarks)" -c "SELECT * FROM bookmarks LIMIT 5;"
```

### Secrets Management

```bash
# List secrets
encore secret list --type local

# Set a secret
encore secret set --type local SecretName

# View secret value (not recommended in production)
encore secret get --type local SecretName
```

---

## 🔐 User Setup (Testing)

### Create Test User

**IMPORTANT**: Users table is in the `users` database, not `bookmarks`!

```bash
# Quick one-liner (note: users database, not bookmarks!)
psql "$(encore db conn-uri users)" -c "
INSERT INTO users (id, email, name)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test User')
ON CONFLICT (id) DO NOTHING;"
```

### Verify User Created

```bash
# Check users database
psql "$(encore db conn-uri users)" -c "SELECT id, email, name FROM users LIMIT 5;"

# Count total users
psql "$(encore db conn-uri users)" -c "SELECT COUNT(*) as total_users FROM users;"
```

---

## 📚 Create Bookmarks

### Test Endpoint (No Auth)

```bash
# YouTube video
curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtu.be/VIDEO_ID","source":"youtube"}'

# Blog post
curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/article","source":"blog"}'

# Podcast
curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"url":"https://podcasts.apple.com/podcast/episode","source":"podcast"}'
```

### Production Endpoint (With Auth)

```bash
# Replace YOUR_JWT_TOKEN with actual Supabase JWT
curl -X POST http://127.0.0.1:4000/bookmarks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "source": "blog",
    "client_time": "2025-10-15T08:00:00Z"
  }'
```

---

## 📊 Check Processing Status

### Quick Status Check

```bash
psql "$(encore db conn-uri bookmarks)" -c "
SELECT
  b.id,
  b.source,
  SUBSTRING(b.url, 1, 40) as url,
  COALESCE(t.status::text, wc.status::text, 'no processing') as status
FROM bookmarks b
LEFT JOIN transcriptions t ON b.id = t.bookmark_id
LEFT JOIN web_contents wc ON b.id = wc.bookmark_id
ORDER BY b.created_at DESC
LIMIT 10;"
```

### Detailed Status

```bash
psql "$(encore db conn-uri bookmarks)" -c "
SELECT
  'Audio Processing' as type,
  status,
  COUNT(*) as count
FROM transcriptions
GROUP BY status
UNION ALL
SELECT
  'Web Content' as type,
  status::text,
  COUNT(*) as count
FROM web_contents
GROUP BY status;"
```

---

## 🗓️ Daily Digests

### Generate Digest (Test)

```bash
# For today's date
curl -X POST http://127.0.0.1:4000/test/digests/generate \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-10-14"}'
```

### View Latest Digest

```bash
psql "$(encore db conn-uri bookmarks)" -c "
SELECT
  digest_date,
  bookmark_count,
  status,
  LENGTH(digest_content) as content_length,
  LEFT(digest_content, 200) || '...' as preview
FROM daily_digests
ORDER BY created_at DESC
LIMIT 1;"
```

### Get Digest via API (Production)

```bash
curl -X GET "http://127.0.0.1:4000/digests/2025-10-14" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🧹 Cleanup & Maintenance

### Delete All Digests

```bash
psql "$(encore db conn-uri bookmarks)" -c "DELETE FROM daily_digests;"
```

### Delete All Bookmarks

```bash
# CAUTION: This will cascade delete transcriptions and web_contents
psql "$(encore db conn-uri bookmarks)" -c "DELETE FROM bookmarks;"
```

### View Database Size

```bash
psql "$(encore db conn-uri bookmarks)" -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## 🔍 Debugging

### Check Server Logs

```bash
# Logs are shown in the terminal where `encore run` is active
# Look for ERROR, ERR, or failed messages

# Filter logs using grep (in another terminal)
encore logs --env=local | grep ERROR
```

### Test API Endpoints

```bash
# List all available endpoints
curl http://127.0.0.1:4000/

# Open API documentation dashboard
open http://127.0.0.1:9400
```

### Check Secrets Loaded

```bash
# This will fail if secrets aren't set
encore run

# Look for this line in output:
# ✔ Fetching application secrets... Done!
```

### Monitor Background Jobs

```bash
# Watch transcription processing
watch -n 5 "psql \"$(encore db conn-uri bookmarks)\" -c \"
SELECT status, COUNT(*) FROM transcriptions GROUP BY status;\""

# Watch web content processing
watch -n 5 "psql \"$(encore db conn-uri bookmarks)\" -c \"
SELECT status, COUNT(*) FROM web_contents GROUP BY status;\""
```

---

## 📈 Useful SQL Queries

### Recent Bookmarks

```sql
SELECT
  id,
  source,
  LEFT(url, 60) as url,
  created_at
FROM bookmarks
ORDER BY created_at DESC
LIMIT 20;
```

### Failed Processing

```sql
SELECT
  b.id,
  b.source,
  b.url,
  COALESCE(t.error_message, wc.error_message) as error
FROM bookmarks b
LEFT JOIN transcriptions t ON b.id = t.bookmark_id AND t.status = 'failed'
LEFT JOIN web_contents wc ON b.id = wc.bookmark_id AND wc.status = 'failed'
WHERE t.status = 'failed' OR wc.status = 'failed';
```

### Processing Statistics

```sql
SELECT
  source,
  COUNT(*) as total_bookmarks,
  COUNT(t.id) as has_transcription,
  COUNT(wc.id) as has_web_content,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as transcription_completed,
  COUNT(CASE WHEN wc.status = 'completed' THEN 1 END) as web_content_completed
FROM bookmarks b
LEFT JOIN transcriptions t ON b.id = t.bookmark_id
LEFT JOIN web_contents wc ON b.id = wc.bookmark_id
GROUP BY source;
```

### Daily Digest Coverage

```sql
SELECT
  digest_date,
  bookmark_count,
  status,
  sources_breakdown,
  LENGTH(digest_content) as content_length
FROM daily_digests
ORDER BY digest_date DESC
LIMIT 30;
```

---

## 🎯 Common Workflows

### Complete E2E Test

```bash
# 1. Create test user (in users database!)
psql "$(encore db conn-uri users)" -c "
INSERT INTO users (id, email, name)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test User')
ON CONFLICT (id) DO NOTHING;"

# 2. Create bookmarks (various types)
curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtu.be/VIDEO_ID","source":"youtube"}'

curl -X POST http://127.0.0.1:4000/test/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/article","source":"blog"}'

# 3. Wait for processing
sleep 60

# 4. Generate digest
curl -X POST http://127.0.0.1:4000/test/digests/generate \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-10-14"}'

# 5. View results
psql "$(encore db conn-uri bookmarks)" -c "
SELECT digest_date, bookmark_count, LENGTH(digest_content)
FROM daily_digests
ORDER BY created_at DESC
LIMIT 1;"
```

---

## 🚨 Emergency Fixes

### Server Won't Start

```bash
encore daemon restart
rm -rf .encore
encore run
```

### Database Corruption

```bash
encore db reset bookmarks
encore run
```

### Stuck Processing Jobs

```bash
# Mark all as failed and restart
psql "$(encore db conn-uri bookmarks)" -c "
UPDATE transcriptions SET status = 'failed' WHERE status = 'processing';
UPDATE web_contents SET status = 'failed' WHERE status = 'processing';"
```

### Clear All Data

```bash
psql "$(encore db conn-uri bookmarks)" -c "
TRUNCATE bookmarks, transcriptions, web_contents, daily_digests CASCADE;"
```

---

## 📞 Getting Help

- **Encore Docs**: https://encore.dev/docs
- **Full Guide**: See [GETTING_STARTED.md](./GETTING_STARTED.md)
- **API Dashboard**: http://127.0.0.1:9400 (when server running)
- **Database Shell**: `encore db shell bookmarks`

---

## 🎓 Key Concepts

- **Bookmarks**: User-saved content (YouTube, podcasts, articles)
- **Processing Pipeline**: Multi-stage async workflow (download → transcribe/extract → summarize)
- **Daily Digest**: AI-generated summary of yesterday's content
- **Test Endpoints**: `/test/*` routes bypass authentication for local development
- **Production Endpoints**: Require JWT token from Supabase

---

**Pro Tip**: Keep this file open in a split terminal while developing for quick copy-paste access to commands! 🚀
