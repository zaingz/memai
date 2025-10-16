# Supabase Authentication UI

This is a simple HTML interface for signing up and signing in users with Supabase to obtain JWT tokens for testing your MemAI API endpoints.

## Quick Start

### 1. Open the Auth UI

**Good news:** Your Supabase credentials are already pre-filled!

Simply open `auth-ui.html` in your web browser:

```bash
# macOS
open auth-ui.html

# Linux
xdg-open auth-ui.html

# Windows
start auth-ui.html
```

Or drag the file into your browser.

### 2. Initialize Supabase

Click the **Initialize Supabase** button. Your credentials are already filled in!

### 3. Sign Up or Sign In

**For New Users:**
1. Click the **Sign Up** tab
2. Enter your email and password (min 6 characters)
3. Click **Sign Up**
4. Copy the JWT token that appears

**For Existing Users:**
1. Click the **Sign In** tab
2. Enter your email and password
3. Click **Sign In**
4. Copy the JWT token that appears

### 4. Use the JWT Token

The token will be displayed in a copyable text box. Click the **Copy Token** button to copy it to your clipboard.

Use this token in your API requests:

```bash
# Example: Get current user profile
curl -X GET http://localhost:4000/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"

# Example: Create a bookmark
curl -X POST http://localhost:4000/bookmarks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtube.com/watch?v=VIDEO_ID",
    "source": "youtube",
    "client_time": "2025-01-01T00:00:00Z"
  }'
```

## Features

- ✅ **Sign Up**: Create new user accounts
- ✅ **Sign In**: Authenticate existing users
- ✅ **JWT Display**: Shows the access token immediately
- ✅ **Copy Button**: One-click token copying
- ✅ **No Backend Required**: Pure client-side HTML/JavaScript
- ✅ **Supabase JS v2**: Uses the latest Supabase client library

## Troubleshooting

### "Failed to initialize Supabase"
- Verify your Supabase URL is correct (should start with `https://` and end with `.supabase.co`)
- Verify your Anon Key is the full key (starts with `eyJ`)

### "Sign up failed: Invalid email"
- Make sure you're using a valid email format
- Check that your password is at least 6 characters

### "Sign up successful! Please check your email"
- Some Supabase projects require email confirmation
- Check your email for a confirmation link
- After confirming, use the **Sign In** tab to get your JWT token

### "User already registered"
- The email is already in use
- Use the **Sign In** tab instead

## Security Note

This is a **development tool** for obtaining JWT tokens for testing. The Anon Key is safe to expose in client-side code (that's its purpose), but:

- **DO NOT** commit this file with your credentials hardcoded
- **DO NOT** use this in production - use proper authentication flows
- **DO NOT** share your JWT tokens publicly

## What's Next?

Once you have your JWT token:

1. Test your protected API endpoints
2. Verify user authentication is working
3. Test bookmark creation and management
4. Test transcription workflows

The token will expire after a certain time (default 1 hour). When it expires, just sign in again to get a new one.
