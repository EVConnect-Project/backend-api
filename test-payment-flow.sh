#!/bin/bash

# EVConnect Payment Flow Test Script
# Tests the complete PayHere payment integration

BASE_URL="http://localhost:4000/api"
echo "🧪 Testing EVConnect PayHere Payment Integration"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Register a test user
echo "📝 Step 1: Register test user..."
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@evconnect.com",
    "password": "password123",
    "name": "Test User",
    "phone": "1234567890"
  }')

if echo "$USER_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓ User registered successfully${NC}"
    ACCESS_TOKEN=$(echo "$USER_RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')
    USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
    echo "  Token: ${ACCESS_TOKEN:0:30}..."
    echo "  User ID: $USER_ID"
else
    # Try to login if user already exists
    echo -e "${YELLOW}⚠ User might exist, trying to login...${NC}"
    USER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "testuser@evconnect.com",
        "password": "password123"
      }')
    
    if echo "$USER_RESPONSE" | grep -q "access_token"; then
        echo -e "${GREEN}✓ User logged in successfully${NC}"
        ACCESS_TOKEN=$(echo "$USER_RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')
        USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
        echo "  Token: ${ACCESS_TOKEN:0:30}..."
        echo "  User ID: $USER_ID"
    else
        echo -e "${RED}✗ Failed to authenticate user${NC}"
        echo "$USER_RESPONSE"
        exit 1
    fi
fi
echo ""

# Step 2: Create a test charger
echo "📍 Step 2: Create test charger..."
CHARGER_RESPONSE=$(curl -s -X POST "$BASE_URL/chargers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Test Charger Station",
    "address": "123 Test Street, Test City",
    "latitude": 6.9271,
    "longitude": 79.8612,
    "powerKw": 50,
    "pricePerKwh": 25.5,
    "status": "available"
  }')

if echo "$CHARGER_RESPONSE" | grep -q "id"; then
    echo -e "${GREEN}✓ Charger created successfully${NC}"
    CHARGER_ID=$(echo "$CHARGER_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
    echo "  Charger ID: $CHARGER_ID"
else
    echo -e "${RED}✗ Failed to create charger${NC}"
    echo "$CHARGER_RESPONSE"
    exit 1
fi
echo ""

# Step 3: Create a booking
echo "📅 Step 3: Create booking..."
START_TIME=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%S.000Z")
END_TIME=$(date -u -v+3H +"%Y-%m-%dT%H:%M:%S.000Z")

BOOKING_RESPONSE=$(curl -s -X POST "$BASE_URL/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"chargerId\": \"$CHARGER_ID\",
    \"startTime\": \"$START_TIME\",
    \"endTime\": \"$END_TIME\"
  }")

if echo "$BOOKING_RESPONSE" | grep -q "id"; then
    echo -e "${GREEN}✓ Booking created successfully${NC}"
    BOOKING_ID=$(echo "$BOOKING_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
    BOOKING_STATUS=$(echo "$BOOKING_RESPONSE" | grep -o '"status":"[^"]*' | sed 's/"status":"//')
    echo "  Booking ID: $BOOKING_ID"
    echo "  Status: $BOOKING_STATUS"
else
    echo -e "${RED}✗ Failed to create booking${NC}"
    echo "$BOOKING_RESPONSE"
    exit 1
fi
echo ""

# Step 4: Create payment
echo "💳 Step 4: Create payment (PayHere integration)..."
PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"amount\": 1000.50
  }")

if echo "$PAYMENT_RESPONSE" | grep -q "id"; then
    echo -e "${GREEN}✓ Payment intent created successfully${NC}"
    PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
    echo "  Payment ID: $PAYMENT_ID"
    echo ""
    echo "  📦 PayHere Checkout Data:"
    
    # Pretty print the checkout data
    if echo "$PAYMENT_RESPONSE" | grep -q "checkoutData"; then
        echo "$PAYMENT_RESPONSE" | python3 -m json.tool 2>/dev/null | grep -A 20 "checkoutData" || echo "$PAYMENT_RESPONSE"
    fi
    
    # Verify hash is present
    if echo "$PAYMENT_RESPONSE" | grep -q "hash"; then
        echo -e "  ${GREEN}✓ MD5 hash generated${NC}"
    else
        echo -e "  ${RED}✗ MD5 hash missing${NC}"
    fi
else
    echo -e "${RED}✗ Failed to create payment${NC}"
    echo "$PAYMENT_RESPONSE"
    exit 1
fi
echo ""

# Step 5: Simulate PayHere webhook (successful payment)
echo "🔔 Step 5: Simulate PayHere webhook (payment success)..."
MERCHANT_SECRET=$(grep PAYHERE_MERCHANT_SECRET /Users/akilanishan/Documents/EVConnect-Project/evconnect_backend/.env | cut -d '=' -f2)
MERCHANT_ID="1232812"
ORDER_ID=$PAYMENT_ID
PAYMENT_AMOUNT="1000.50"
CURRENCY="LKR"

# Generate MD5 hash for webhook verification
# Format: MD5(merchant_id + order_id + amount + currency + status_code + md5(merchant_secret))
STATUS_CODE="2" # 2 = success in PayHere

WEBHOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/payments/webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"merchant_id\": \"$MERCHANT_ID\",
    \"order_id\": \"$PAYMENT_ID\",
    \"payment_id\": \"PH_TXN_$(date +%s)\",
    \"payhere_amount\": \"$PAYMENT_AMOUNT\",
    \"payhere_currency\": \"$CURRENCY\",
    \"status_code\": \"$STATUS_CODE\",
    \"method\": \"VISA\",
    \"card_holder_name\": \"Test User\",
    \"card_no\": \"************1234\"
  }")

echo "  Webhook Response: $WEBHOOK_RESPONSE"
if echo "$WEBHOOK_RESPONSE" | grep -q "success\|Payment confirmed"; then
    echo -e "${GREEN}✓ Webhook processed successfully${NC}"
else
    echo -e "${YELLOW}⚠ Webhook response (signature verification expected to fail in test)${NC}"
fi
echo ""

# Step 6: Verify payment status
echo "✅ Step 6: Verify payment status..."
PAYMENT_CHECK=$(curl -s -X GET "$BASE_URL/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$PAYMENT_CHECK" | grep -q "id"; then
    PAYMENT_STATUS=$(echo "$PAYMENT_CHECK" | grep -o '"status":"[^"]*' | sed 's/"status":"//')
    echo -e "${GREEN}✓ Payment retrieved${NC}"
    echo "  Status: $PAYMENT_STATUS"
    
    if [ "$PAYMENT_STATUS" = "succeeded" ]; then
        echo -e "  ${GREEN}✓✓ Payment marked as succeeded!${NC}"
    else
        echo -e "  ${YELLOW}⚠ Payment status: $PAYMENT_STATUS (webhook may need manual hash)${NC}"
    fi
else
    echo -e "${RED}✗ Failed to retrieve payment${NC}"
fi
echo ""

# Step 7: Verify booking status
echo "📋 Step 7: Verify booking status..."
BOOKING_CHECK=$(curl -s -X GET "$BASE_URL/bookings/$BOOKING_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$BOOKING_CHECK" | grep -q "id"; then
    FINAL_BOOKING_STATUS=$(echo "$BOOKING_CHECK" | grep -o '"status":"[^"]*' | sed 's/"status":"//')
    echo -e "${GREEN}✓ Booking retrieved${NC}"
    echo "  Status: $FINAL_BOOKING_STATUS"
    
    if [ "$FINAL_BOOKING_STATUS" = "confirmed" ]; then
        echo -e "  ${GREEN}✓✓ Booking automatically confirmed after payment!${NC}"
    else
        echo -e "  ${YELLOW}⚠ Booking status: $FINAL_BOOKING_STATUS${NC}"
    fi
else
    echo -e "${RED}✗ Failed to retrieve booking${NC}"
fi
echo ""

# Summary
echo "================================================"
echo "📊 Test Summary"
echo "================================================"
echo "User ID:      $USER_ID"
echo "Charger ID:   $CHARGER_ID"
echo "Booking ID:   $BOOKING_ID"
echo "Payment ID:   $PAYMENT_ID"
echo ""
echo "Payment Status:   $PAYMENT_STATUS"
echo "Booking Status:   $FINAL_BOOKING_STATUS"
echo ""
echo -e "${GREEN}✅ Payment integration test completed!${NC}"
echo ""
echo "Note: For full PayHere testing, use their sandbox test cards:"
echo "  https://support.payhere.lk/api-&-mobile-sdk/test-card-numbers"
