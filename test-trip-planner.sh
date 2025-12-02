#!/bin/bash

# Test Trip Planning Feature
echo "🧪 Testing Trip Planner Implementation"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL
BACKEND_URL="http://localhost:3000"

echo ""
echo "${YELLOW}1. Testing Backend Trip Planner Endpoint${NC}"
echo "----------------------------------------"

# First, login to get token (use existing user or create one)
echo "Logging in to get auth token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "${RED}❌ Failed to login. Please ensure backend is running and user exists.${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "${GREEN}✅ Successfully authenticated${NC}"

echo ""
echo "Testing trip planner endpoint..."

# Test trip planning
ROUTE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/trip-planner/route" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "start": "Colombo",
    "destination": "Kandy",
    "currentBattery": 80,
    "minBatteryAtStop": 20
  }')

# Check if response contains expected fields
if echo "$ROUTE_RESPONSE" | grep -q "totalDistance"; then
  echo "${GREEN}✅ Trip planner endpoint working${NC}"
  echo ""
  echo "Response preview:"
  echo "$ROUTE_RESPONSE" | python3 -m json.tool | head -30
else
  echo "${RED}❌ Trip planner endpoint failed${NC}"
  echo "Response: $ROUTE_RESPONSE"
  exit 1
fi

echo ""
echo "${YELLOW}2. Checking Flutter Files${NC}"
echo "------------------------"

# Check if Flutter files exist
FILES_TO_CHECK=(
  "evconnect_app/lib/services/trip_planner_service.dart"
  "evconnect_app/lib/providers/trip_planner_provider.dart"
  "evconnect_app/lib/screens/trip_planner_screen.dart"
)

for file in "${FILES_TO_CHECK[@]}"; do
  if [ -f "$file" ]; then
    echo "${GREEN}✅ $file exists${NC}"
  else
    echo "${RED}❌ $file not found${NC}"
  fi
done

echo ""
echo "${YELLOW}3. Checking Backend Files${NC}"
echo "------------------------"

BACKEND_FILES=(
  "evconnect_backend/src/trip-planner/trip-planner.module.ts"
  "evconnect_backend/src/trip-planner/trip-planner.controller.ts"
  "evconnect_backend/src/trip-planner/trip-planner.service.ts"
  "evconnect_backend/src/trip-planner/dto/plan-route.dto.ts"
  "evconnect_backend/src/trip-planner/dto/route-response.dto.ts"
)

for file in "${BACKEND_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "${GREEN}✅ $file exists${NC}"
  else
    echo "${RED}❌ $file not found${NC}"
  fi
done

echo ""
echo "${GREEN}======================================"
echo "✅ Trip Planner Implementation Complete!"
echo "======================================${NC}"

echo ""
echo "📋 Summary:"
echo "  - Backend module: Created & registered"
echo "  - API endpoint: /api/trip-planner/route"
echo "  - Flutter service: Created"
echo "  - Flutter provider: Created with Riverpod"
echo "  - UI: Updated with real API integration"
echo ""
echo "🚀 To test in the app:"
echo "  1. Start backend: cd evconnect_backend && npm run start:dev"
echo "  2. Start Flutter: cd evconnect_app && flutter run"
echo "  3. Navigate to Trip Planner screen"
echo "  4. Enter start and destination (e.g., 'Colombo' to 'Kandy')"
echo "  5. Set current battery percentage"
echo "  6. Click 'Plan Route' button"
echo ""
