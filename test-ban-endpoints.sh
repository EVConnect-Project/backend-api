#!/bin/bash

# Test ban endpoints
API_URL="http://localhost:4000/api"

echo "🔐 First, login as admin to get token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@evconnect.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login. Response:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✅ Login successful! Token: ${TOKEN:0:20}..."
echo ""

# Test 1: Get chargers to find an ID
echo "📋 Getting chargers list..."
CHARGERS=$(curl -s "$API_URL/admin/chargers?page=1&limit=1" \
  -H "Authorization: Bearer $TOKEN")

echo "Chargers response:"
echo $CHARGERS | jq '.' 2>/dev/null || echo $CHARGERS
echo ""

# Extract first charger ID
CHARGER_ID=$(echo $CHARGERS | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$CHARGER_ID" ]; then
  echo "🔌 Testing ban charger: $CHARGER_ID"
  BAN_RESPONSE=$(curl -s -X POST "$API_URL/admin/chargers/$CHARGER_ID/ban" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  echo "Ban response:"
  echo $BAN_RESPONSE | jq '.' 2>/dev/null || echo $BAN_RESPONSE
  echo ""
else
  echo "⚠️  No chargers found to test"
  echo ""
fi

# Test 2: Get mechanics to find an ID
echo "📋 Getting mechanics list..."
MECHANICS=$(curl -s "$API_URL/admin/mechanics?page=1&limit=1" \
  -H "Authorization: Bearer $TOKEN")

echo "Mechanics response:"
echo $MECHANICS | jq '.' 2>/dev/null || echo $MECHANICS
echo ""

MECHANIC_ID=$(echo $MECHANICS | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$MECHANIC_ID" ]; then
  echo "🔧 Testing ban mechanic: $MECHANIC_ID"
  BAN_RESPONSE=$(curl -s -X POST "$API_URL/admin/mechanics/$MECHANIC_ID/ban" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  echo "Ban response:"
  echo $BAN_RESPONSE | jq '.' 2>/dev/null || echo $BAN_RESPONSE
  echo ""
else
  echo "⚠️  No mechanics found to test"
  echo ""
fi

# Test 3: Get marketplace listings to find an ID
echo "📋 Getting marketplace listings..."
LISTINGS=$(curl -s "$API_URL/admin/marketplace/listings?page=1&limit=1" \
  -H "Authorization: Bearer $TOKEN")

echo "Listings response:"
echo $LISTINGS | jq '.' 2>/dev/null || echo $LISTINGS
echo ""

LISTING_ID=$(echo $LISTINGS | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$LISTING_ID" ]; then
  echo "🛍️  Testing ban marketplace listing: $LISTING_ID"
  BAN_RESPONSE=$(curl -s -X POST "$API_URL/admin/marketplace/listings/$LISTING_ID/ban" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  echo "Ban response:"
  echo $BAN_RESPONSE | jq '.' 2>/dev/null || echo $BAN_RESPONSE
  echo ""
else
  echo "⚠️  No listings found to test"
  echo ""
fi

echo "✅ Test complete!"
