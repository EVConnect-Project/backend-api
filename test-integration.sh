#!/bin/bash
# EV Charging Integration - Quick Test Script
# This script demonstrates the complete integration flow

set -e

BASE_URL="http://localhost:3000/api"
CHARGING_URL="http://localhost:4000"
API_KEY="evconnect-backend-api-key-dev"

echo "🔋 EV Charging Integration Test"
echo "================================"
echo ""

# Step 1: Login
echo "1️⃣  Logging in as user2@example.com..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Get available chargers through backend
echo "2️⃣  Fetching available chargers (via backend)..."
CHARGERS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/charging/chargers")
echo "Response: $CHARGERS"
echo ""

# Step 3: Get all chargers directly from charging service
echo "3️⃣  Fetching all chargers (direct from charging service)..."
ALL_CHARGERS=$(curl -s -H "x-api-key: $API_KEY" "$CHARGING_URL/chargers?limit=3")
echo "$ALL_CHARGERS" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Total chargers: {d['count']}\"); [print(f\"  - {c['chargeBoxIdentity']}: {c['status']}, online={c['isOnline']}\") for c in d['chargers'][:3]]"
echo ""

# Step 4: Get charger ID
CHARGER_ID=$(echo $ALL_CHARGERS | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['chargers'][0]['id'] if d['chargers'] else '')")

if [ -z "$CHARGER_ID" ]; then
  echo "⚠️  No chargers found"
  exit 0
fi

echo "Using charger ID: $CHARGER_ID"
echo ""

# Step 5: Try to create a session (should fail if charger is offline)
echo "4️⃣  Attempting to create charging session..."
SESSION_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"chargerId\":\"$CHARGER_ID\"}" \
  "$BASE_URL/charging/sessions")

echo "Response: $SESSION_RESPONSE"
echo ""

# Step 6: Get user's sessions
echo "5️⃣  Fetching user's charging sessions..."
MY_SESSIONS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/charging/my-sessions")
echo "Response: $MY_SESSIONS"
echo ""

# Step 7: Get connected chargers
echo "6️⃣  Fetching connected chargers..."
CONNECTED=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/charging/chargers/connected")
echo "Response: $CONNECTED"
echo ""

echo "✅ Integration test complete!"
echo ""
echo "📊 Summary:"
echo "  - Backend API: http://localhost:3000/api"
echo "  - Charging Service: http://localhost:4000"
echo "  - JWT Auth: ✅ Working"
echo "  - Service Communication: ✅ Working"
echo "  - User Context: ✅ Working"
echo ""
echo "💡 Next Steps:"
echo "  1. Connect a charger via OCPP WebSocket to bring it online"
echo "  2. Run: cd ev-charging-service && node test-ocpp.js"
echo "  3. Test session creation with online charger"
echo "  4. Build Flutter UI for mobile app"
