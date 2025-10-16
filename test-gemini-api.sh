#!/bin/bash
#
# Test Script for Gemini API Key
# This validates your Gemini API key works correctly
#
# Usage: ./test-gemini-api.sh YOUR_API_KEY
#

set -e

if [ -z "$1" ]; then
  echo "❌ Error: API key required"
  echo ""
  echo "Usage: ./test-gemini-api.sh YOUR_API_KEY"
  echo ""
  echo "Get your API key from: https://aistudio.google.com/apikey"
  exit 1
fi

API_KEY="$1"

echo "🧪 Testing Gemini API with your key..."
echo ""
echo "API Key: ${API_KEY:0:10}...${API_KEY: -4}"
echo "Endpoint: generativelanguage.googleapis.com"
echo ""

# Test 1: Simple text generation
echo "📝 Test 1: Simple text generation"
RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Say hello in 3 words"
          }
        ]
      }
    ]
  }')

# Check for errors
if echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ FAILED: API key is not working"
  echo ""
  echo "Error response:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo ""
  echo "Common issues:"
  echo "1. API key is from Google Cloud Console (should be from Google AI Studio)"
  echo "2. API key is invalid or expired"
  echo "3. Generative Language API not enabled"
  echo ""
  echo "Fix:"
  echo "1. Go to https://aistudio.google.com/apikey"
  echo "2. Create a new API key"
  echo "3. Run: encore secret set --type local GeminiApiKey"
  exit 1
fi

if echo "$RESPONSE" | grep -q '"candidates"'; then
  echo "✅ SUCCESS: API key works for text generation!"
  echo ""
  echo "Response preview:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -20 || echo "$RESPONSE" | head -20
  echo ""
else
  echo "⚠️  Unexpected response format"
  echo "$RESPONSE"
  exit 1
fi

# Test 2: YouTube video access
echo ""
echo "📺 Test 2: YouTube video transcription"
echo "Testing with public YouTube video..."

RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "What is this video about? Give a 1 sentence summary."
          },
          {
            "fileData": {
              "fileUri": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            }
          }
        ]
      }
    ]
  }')

if echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ FAILED: YouTube video access not working"
  echo ""
  echo "Error response:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo ""
  echo "This might be because:"
  echo "1. YouTube quota exceeded (8 hours/day on free tier)"
  echo "2. Video is private or restricted"
  echo "3. Feature not enabled for your API key"
  exit 1
fi

if echo "$RESPONSE" | grep -q '"candidates"'; then
  echo "✅ SUCCESS: YouTube transcription works!"
  echo ""
  echo "Response preview:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -20 || echo "$RESPONSE" | head -20
  echo ""
else
  echo "⚠️  Unexpected response format"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "🎉 All tests passed! Your API key is configured correctly."
echo ""
echo "Next steps:"
echo "1. Set the API key in Encore: encore secret set --type local GeminiApiKey"
echo "2. Paste your API key when prompted"
echo "3. Restart the server: encore run"
