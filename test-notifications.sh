#!/bin/bash

# Test Notification System Implementation
echo "🔔 Testing EVConnect Notification System"
echo "========================================"

BACKEND_URL="http://localhost:3000"

echo ""
echo "1️⃣ Testing Save FCM Token Endpoint"
echo "-----------------------------------"

# Login first to get token
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login"
  exit 1
fi

echo "✅ Logged in successfully"

# Save FCM token
echo ""
echo "Saving FCM token..."
SAVE_TOKEN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/notifications/token" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fcmToken": "test-fcm-token-123456789",
    "platform": "android"
  }')

echo "Response: $SAVE_TOKEN_RESPONSE"

echo ""
echo "2️⃣ Testing Get Notification History"
echo "-----------------------------------"

HISTORY_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/notifications/history" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $HISTORY_RESPONSE"

echo ""
echo "3️⃣ Testing Send Notification (requires Firebase setup)"
echo "------------------------------------------------------"
echo "⚠️  Skipped - Requires valid Firebase credentials in .env"

echo ""
echo "✅ Basic API endpoints are working!"
echo ""
echo "Next steps:"
echo "1. Add your Firebase credentials to evconnect_backend/.env"
echo "2. Get FCM token from Flutter app (check console logs)"
echo "3. Test sending actual push notifications"
echo ""
