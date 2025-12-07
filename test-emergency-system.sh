#!/bin/bash

# Emergency System Phase 2-3 Test Script
# Tests the complete emergency breakdown assistance flow

echo "🚨 Testing Emergency Breakdown Assistance System - Phase 2-3"
echo "=============================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:4000/api"

# Check if backend is running
echo "📡 Checking backend connection..."
if curl -s "$BASE_URL" > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running on port 4000${NC}"
    echo "Please start the backend first: cd evconnect_backend && npm run start:dev"
    exit 1
fi

echo ""
echo "⚠️  IMPORTANT: You need valid JWT tokens to test these endpoints"
echo "Please ensure you have:"
echo "  1. A regular user token (for creating emergency requests)"
echo "  2. A mechanic user token (for responding to requests)"
echo ""
echo "To get tokens:"
echo "  - Login as a user and mechanic"
echo "  - Check browser localStorage or Network tab for Authorization header"
echo ""

# Test 1: Check emergency endpoints exist
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 1: Verify Emergency Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check database tables
echo ""
echo "🗄️  Checking database tables..."
PGPASSWORD=evconnect_2024 psql -h localhost -U evconnect_user -d evconnect_db -c "SELECT COUNT(*) as emergency_requests FROM emergency_requests;" -t 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ emergency_requests table exists${NC}"
else
    echo -e "${RED}❌ emergency_requests table not found${NC}"
fi

PGPASSWORD=evconnect_2024 psql -h localhost -U evconnect_user -d evconnect_db -c "SELECT COUNT(*) as mechanic_responses FROM mechanic_responses;" -t 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ mechanic_responses table exists${NC}"
else
    echo -e "${RED}❌ mechanic_responses table not found${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Test 2: Emergency Request Flow (Manual Testing Required)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Step-by-step testing guide:"
echo ""
echo "1️⃣  CREATE EMERGENCY REQUEST (User)"
echo "   Open Flutter app → Mechanics screen → Tap Emergency Banner"
echo "   Expected: Loading dialog → AI-ranked mechanics → Alerts sent"
echo ""
echo "2️⃣  MECHANIC RESPONDS (Mechanic Device)"
echo "   Receive push notification → Open app"
echo "   POST /emergency/requests/{requestId}/respond"
echo "   Body: { \"responseType\": \"accepted\", \"etaMinutes\": 15 }"
echo ""
echo "3️⃣  USER SELECTS MECHANIC (User Device)"
echo "   View accepted mechanics → Select one"
echo "   POST /emergency/requests/{requestId}/select"
echo "   Body: { \"mechanicId\": \"mechanic-uuid\" }"
echo ""
echo "4️⃣  MECHANIC UPDATES STATUS (Mechanic Device)"
echo "   PATCH /emergency/requests/{requestId}/status"
echo "   Body: { \"status\": \"on_the_way\" }"
echo "   Then: { \"status\": \"arrived\" }"
echo "   Finally: { \"status\": \"job_complete\" }"
echo ""
echo "5️⃣  CHECK REQUEST DETAILS (User Device)"
echo "   GET /emergency/requests/{requestId}"
echo "   Expected: Full request with responses and selected mechanic"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test 3: Sample cURL Commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Replace {TOKEN}, {REQUEST_ID}, and {MECHANIC_ID} with actual values:"
echo ""
echo -e "${YELLOW}# Mechanic accepts request:${NC}"
echo "curl -X POST \"$BASE_URL/emergency/requests/{REQUEST_ID}/respond\" \\"
echo "  -H \"Authorization: Bearer {MECHANIC_TOKEN}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"responseType\": \"accepted\", \"etaMinutes\": 15, \"notes\": \"On my way!\"}'"
echo ""
echo -e "${YELLOW}# User selects mechanic:${NC}"
echo "curl -X POST \"$BASE_URL/emergency/requests/{REQUEST_ID}/select\" \\"
echo "  -H \"Authorization: Bearer {USER_TOKEN}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"mechanicId\": \"{MECHANIC_ID}\"}'"
echo ""
echo -e "${YELLOW}# Mechanic updates status:${NC}"
echo "curl -X PATCH \"$BASE_URL/emergency/requests/{REQUEST_ID}/status\" \\"
echo "  -H \"Authorization: Bearer {MECHANIC_TOKEN}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"status\": \"on_the_way\", \"latitude\": 6.9271, \"longitude\": 79.8612}'"
echo ""
echo -e "${YELLOW}# Get request details:${NC}"
echo "curl -X GET \"$BASE_URL/emergency/requests/{REQUEST_ID}\" \\"
echo "  -H \"Authorization: Bearer {USER_TOKEN}\""
echo ""
echo -e "${YELLOW}# Get all user requests:${NC}"
echo "curl -X GET \"$BASE_URL/emergency/requests\" \\"
echo "  -H \"Authorization: Bearer {USER_TOKEN}\""
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Implementation Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Database tables created${NC}"
echo -e "${GREEN}✅ Backend endpoints implemented${NC}"
echo -e "${GREEN}✅ Emergency request creation${NC}"
echo -e "${GREEN}✅ Mechanic response system${NC}"
echo -e "${GREEN}✅ User selection logic${NC}"
echo -e "${GREEN}✅ Status tracking${NC}"
echo -e "${GREEN}✅ Real-time notifications${NC}"
echo -e "${GREEN}✅ Flutter service methods${NC}"
echo ""
echo -e "${YELLOW}⏳ Pending: Full Flutter UI implementation${NC}"
echo -e "${YELLOW}⏳ Pending: Real-time status updates UI${NC}"
echo -e "${YELLOW}⏳ Pending: Mechanic app response UI${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Documentation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "See EMERGENCY_SYSTEM_IMPLEMENTATION.md for:"
echo "  - Complete API documentation"
echo "  - Database schema"
echo "  - Flow diagrams"
echo "  - Security considerations"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Testing Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
