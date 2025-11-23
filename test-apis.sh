#!/bin/bash

# Quick API Test Script
echo "🧪 Testing Phase 2 Backend APIs..."
echo ""

BASE_URL="http://localhost:3000/api"

# Test 1: Rating Summary (Public - should return 500 for non-existent charger but proves endpoint works)
echo "1️⃣  Testing GET /chargers/:id/rating-summary"
curl -s "$BASE_URL/chargers/test-123/rating-summary" | head -c 100
echo -e "\n"

# Test 2: Reviews List (Public - should return empty array or 500)
echo "2️⃣  Testing GET /chargers/:id/reviews"
curl -s "$BASE_URL/chargers/test-123/reviews?page=1&limit=10" | head -c 100
echo -e "\n"

# Test 3: Favorites (Should require auth - expect 401)
echo "3️⃣  Testing GET /favorites (should require auth)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/favorites")
if [ "$HTTP_CODE" == "401" ]; then
    echo "✅ Auth protection working (HTTP 401)"
else
    echo "❌ Unexpected response (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4: Photo upload endpoint exists
echo "4️⃣  Testing POST /cloudinary/upload (should require auth)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/cloudinary/upload")
if [ "$HTTP_CODE" == "401" ]; then
    echo "✅ Auth protection working (HTTP 401)"
else
    echo "❌ Unexpected response (HTTP $HTTP_CODE)"
fi
echo ""

echo "✅ Basic API tests complete!"
echo ""
echo "Next: Run Flutter app to test full integration"
echo "  cd evconnect_app && flutter run -d chrome"
