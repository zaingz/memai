# MemAI Quick Start Guide

## ✅ Setup Complete!

Your environment variables are configured:
- ✅ Supabase URL: `https://wykjjshvcwfiyvzmvocf.supabase.co`
- ✅ Supabase Anon Key: Configured
- ✅ Backend API: `http://localhost:4000`

---

## 🚀 Start the Application

### Terminal 1: Backend (Encore)

```bash
# From project root
encore run
```

**Expected output:**
```
API Base URL:      http://localhost:4000
Dev Dashboard URL: http://localhost:9400
```

---

### Terminal 2: Frontend (React + Vite)

```bash
# From project root
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 🌐 Access the Application

1. **Frontend:** http://localhost:5173
2. **Backend API:** http://localhost:4000
3. **Encore Dashboard:** http://localhost:9400

---

## 👤 First Time Setup

### 1. Create Your Account

1. Visit http://localhost:5173
2. Click "Sign up"
3. Enter email and password (min 8 characters)
4. Click "Create account"
5. **Check your email** for verification link
6. Click the verification link
7. Return to app and login

### 2. Add Your First Bookmark

1. After login, navigate to "Bookmarks"
2. Paste a YouTube URL (e.g., `https://youtube.com/watch?v=dQw4w9WgXcQ`)
3. Click "Add"
4. Watch the transcription status update automatically!

### 3. Generate Your First Digest

1. Add a few more bookmarks (YouTube, articles, etc.)
2. Navigate to "Digests"
3. Click "Generate Today's Digest"
4. Wait for AI to process your bookmarks
5. View your personalized summary!

---

## 📋 Feature Checklist

**Authentication:**
- [x] Signup with email verification
- [x] Login with session persistence
- [x] Password reset via email
- [x] Auto JWT attachment to API calls

**Bookmarks:**
- [x] Add bookmarks (YouTube, web articles, etc.)
- [x] View list of all bookmarks
- [x] Delete bookmarks
- [x] Auto-polling for transcription status
- [x] See source badges (YouTube, Podcast, etc.)

**Daily Digests:**
- [x] Generate AI-powered daily summaries
- [x] View past digests
- [x] See bookmark counts per digest
- [x] View digest status (pending/completed)

**Dashboard:**
- [x] Recent bookmarks overview
- [x] Recent digests overview
- [x] Quick navigation
- [x] User menu with sign out

---

## 🔧 Troubleshooting

### Frontend won't start

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend won't start

```bash
# Check if port 4000 is already in use
lsof -ti:4000 | xargs kill -9

# Restart Encore daemon
encore daemon restart

# Try again
encore run
```

### Can't verify email

1. Check spam folder
2. In Supabase dashboard:
   - Go to Authentication → Users
   - Find your user
   - Click "..." → "Confirm user"

### CORS errors

Make sure `encore.app` has:
```json
{
  "global_cors": {
    "allow_origins_with_credentials": [
      "http://localhost:5173"
    ]
  }
}
```

---

## 🎯 What to Test

1. **Complete Auth Flow:**
   - Signup → Verify email → Login → Dashboard

2. **YouTube Transcription:**
   - Add YouTube URL
   - Watch status change: pending → processing → completed
   - See transcription appear (if implemented detail page)

3. **Daily Digest:**
   - Add 3-5 bookmarks
   - Generate digest
   - View AI-generated summary

4. **Navigation:**
   - Dashboard → Bookmarks → Digests → Back to Dashboard

5. **Session Persistence:**
   - Refresh page (should stay logged in)
   - Close tab and reopen (should stay logged in)

6. **Sign Out:**
   - Click "Sign out"
   - Try accessing /dashboard (should redirect to login)

---

## 📊 What's Working vs. What's Next

### ✅ Working Now
- Complete authentication system
- Bookmark CRUD operations
- Digest generation & viewing
- Real-time transcription polling
- Responsive UI with Tailwind

### 🚧 Future Enhancements
- Bookmark detail page (view full transcription)
- Digest detail page (formatted content viewer)
- Search & filter bookmarks
- Toast notifications
- User profile settings
- Analytics dashboard

---

## 🐛 Known Limitations

1. **Transcription Polling:**
   - Uses 5-second intervals
   - Could be optimized with WebSocket

2. **Digest Generation:**
   - Synchronous (may timeout for 100+ bookmarks)
   - No progress indicator

3. **Error Handling:**
   - Basic error messages
   - No toast notifications yet

4. **Type Safety:**
   - Some API responses use `any`
   - Can be improved with better types

---

## 📚 Tech Stack Reference

**Frontend:**
- React 18 + TypeScript
- Vite 6 (build tool)
- React Router v6 (routing)
- TanStack Query v5 (data fetching)
- Tailwind CSS + shadcn/ui (styling)
- Supabase Auth (authentication)

**Backend:**
- Encore.ts (TypeScript backend framework)
- PostgreSQL (database)
- Supabase (auth provider)
- Deepgram (audio transcription)
- OpenAI (summaries)
- Google Gemini (alt transcription)

**APIs:**
- Encore auto-generated TypeScript client
- Type-safe end-to-end
- Auto JWT attachment

---

## 🎉 You're Ready!

Your full-stack MemAI application is configured and ready to use:
1. ✅ Backend running on port 4000
2. ✅ Frontend on port 5173
3. ✅ Supabase connected
4. ✅ All environment variables set

**Start both servers and visit http://localhost:5173 to begin!**
