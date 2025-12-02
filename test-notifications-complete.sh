#!/bin/bash

echo "🧪 Comprehensive Notification System Test"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000/api"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local token=$5
    
    echo -n "Testing: $test_name... "
    
    if [ "$method" == "POST" ]; then
        if [ -n "$token" ]; then
            response=$(curl -s -X POST "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data")
        else
            response=$(curl -s -X POST "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ -n "$token" ]; then
            response=$(curl -s -X GET "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token")
        else
            response=$(curl -s -X GET "$BASE_URL$endpoint")
        fi
    fi
    
    if echo "$response" | grep -q "success"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        echo "   Response: $response"
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAILED++))
        echo "   Response: $response"
    fi
    echo ""
}

# 1. Check if backend is running
echo -e "${YELLOW}1️⃣ Checking Backend Status${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running. Start it with: cd evconnect_backend && npm run start:dev${NC}"
    exit 1
fi
echo ""

# 2. Login to get JWT token
echo -e "${YELLOW}2️⃣ Authenticating User${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    JWT_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "   Token: ${JWT_TOKEN:0:50}..."
else
    echo -e "${YELLOW}⚠️ Test user doesn't exist, trying to register...${NC}"
    REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"password123","name":"Test User"}')
    
    if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
        JWT_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        echo -e "${GREEN}✅ Registration successful${NC}"
    else
        echo -e "${RED}❌ Authentication failed${NC}"
        echo "   Response: $REGISTER_RESPONSE"
        exit 1
    fi
fi
echo ""

# 3. Save FCM Token
echo -e "${YELLOW}3️⃣ Testing FCM Token Save${NC}"
test_endpoint "Save FCM Token" "POST" "/notifications/token" \
    '{"fcmToken":"test-fcm-token-12345","platform":"web","deviceId":"test-device"}' \
    "$JWT_TOKEN"

# 4. Get Notification History
echo -e "${YELLOW}4️⃣ Testing Notification History${NC}"
test_endpoint "Get Notification History" "GET" "/notifications/history" "" "$JWT_TOKEN"

# 5. Send Test Notification
echo -e "${YELLOW}5️⃣ Testing Send Notification${NC}"
test_endpoint "Send Test Notification" "POST" "/notifications/test" \
    '{"type":"booking_confirmed","title":"Test Notification","body":"This is a test","data":{}}' \
    "$JWT_TOKEN"

# 6. Check Database Tables
echo -e "${YELLOW}6️⃣ Checking Database Tables${NC}"
echo "Checking if notification tables exist..."

DB_CHECK=$(psql -h localhost -U akilanishan -d evconnect -t -c "
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('fcm_tokens', 'notification_logs');" 2>/dev/null)

if echo "$DB_CHECK" | grep -q "fcm_tokens"; then
    echo -e "${GREEN}✅ fcm_tokens table exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ fcm_tokens table missing${NC}"
    ((FAILED++))
fi

if echo "$DB_CHECK" | grep -q "notification_logs"; then
    echo -e "${GREEN}✅ notification_logs table exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ notification_logs table missing${NC}"
    ((FAILED++))
fi
echo ""

# 7. Check FCM Tokens in Database
echo -e "${YELLOW}7️⃣ Checking Saved FCM Tokens${NC}"
TOKEN_COUNT=$(psql -h localhost -U akilanishan -d evconnect -t -c "SELECT COUNT(*) FROM fcm_tokens;" 2>/dev/null | xargs)
echo "FCM tokens in database: $TOKEN_COUNT"
if [ "$TOKEN_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ FCM tokens are being saved${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️ No FCM tokens saved yet${NC}"
fi
echo ""

# 8. Check Notification Logs
echo -e "${YELLOW}8️⃣ Checking Notification Logs${NC}"
LOG_COUNT=$(psql -h localhost -U akilanishan -d evconnect -t -c "SELECT COUNT(*) FROM notification_logs;" 2>/dev/null | xargs)
echo "Notification logs in database: $LOG_COUNT"
if [ "$LOG_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Notifications are being logged${NC}"
    ((PASSED++))
    
    echo "Recent notifications:"
    psql -h localhost -U akilanishan -d evconnect -c "
    SELECT type, title, status, \"createdAt\" 
    FROM notification_logs 
    ORDER BY \"createdAt\" DESC 
    LIMIT 3;" 2>/dev/null
else
    echo -e "${YELLOW}⚠️ No notification logs yet${NC}"
fi
echo ""

# 9. Check NotificationsService Integration
echo -e "${YELLOW}9️⃣ Checking Service Integration${NC}"
if grep -q "private notificationsService: NotificationsService" evconnect_backend/src/bookings/bookings.service.ts; then
    echo -e "${GREEN}✅ NotificationsService injected in BookingsService${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ NotificationsService not injected in BookingsService${NC}"
    ((FAILED++))
fi

if grep -q "sendBookingConfirmed" evconnect_backend/src/bookings/bookings.service.ts; then
    echo -e "${GREEN}✅ Booking confirmation notification integrated${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Booking confirmation notification missing${NC}"
    ((FAILED++))
fi

if grep -q "sendBookingAutoCancelled" evconnect_backend/src/bookings/bookings.service.ts; then
    echo -e "${GREEN}✅ Auto-cancel notification integrated${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Auto-cancel notification missing${NC}"
    ((FAILED++))
fi
echo ""

# 10. Check Flutter Integration
echo -e "${YELLOW}🔟 Checking Flutter Integration${NC}"
if grep -q "_saveFcmTokenToBackend" evconnect_app/lib/services/notification_service.dart; then
    echo -e "${GREEN}✅ Flutter FCM token save implemented${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Flutter FCM token save missing${NC}"
    ((FAILED++))
fi

if grep -q "FlutterSecureStorage" evconnect_app/lib/services/notification_service.dart; then
    echo -e "${GREEN}✅ JWT authentication in Flutter notification service${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ JWT authentication missing in Flutter${NC}"
    ((FAILED++))
fi
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}Tests Passed: $PASSED${NC}"
echo -e "${RED}Tests Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Notification system is working!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
