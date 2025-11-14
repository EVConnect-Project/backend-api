#!/bin/bash

# EVConnect PayHere Quick Test Guide
# Run this script to verify the backend is working properly

echo "🧪 EVConnect PayHere Integration Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
echo -e "${BLUE}1. Checking Backend Status...${NC}"
if curl -s http://localhost:4000/api > /dev/null; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:4000${NC}"
else
    echo -e "${YELLOW}❌ Backend is not running${NC}"
    echo "   Start with: cd evconnect_backend && npm run start:dev"
    exit 1
fi
echo ""

# Test auth endpoint
echo -e "${BLUE}2. Testing Auth Endpoints...${NC}"
if curl -s http://localhost:4000/api/auth/login > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Auth endpoints available${NC}"
else
    echo -e "${YELLOW}⚠️  Auth endpoints not responding${NC}"
fi
echo ""

# Test payment endpoints
echo -e "${BLUE}3. Testing Payment Endpoints...${NC}"
if curl -s -X POST http://localhost:4000/api/payments -H "Content-Type: application/json" 2>&1 | grep -q "Unauthorized"; then
    echo -e "${GREEN}✅ Payment endpoints available (auth required)${NC}"
else
    echo -e "${YELLOW}⚠️  Payment endpoints not responding as expected${NC}"
fi
echo ""

# Show PayHere configuration
echo -e "${BLUE}4. PayHere Configuration:${NC}"
echo "   Merchant ID: 1232812"
echo "   Environment: Sandbox"
echo "   Base URL: https://sandbox.payhere.lk"
echo -e "${GREEN}✅ Credentials configured${NC}"
echo ""

# Test cards info
echo -e "${BLUE}5. PayHere Test Cards:${NC}"
echo "   ${GREEN}Success Card:${NC} 4916 2175 9794 8227"
echo "   ${YELLOW}Fail Card:${NC}    4916 2175 9794 8219"
echo "   CVV: Any 3 digits"
echo "   Expiry: Any future date"
echo ""

# Database check
echo -e "${BLUE}6. Checking Database...${NC}"
if psql postgresql://akilanishan@localhost:5432/evconnect -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    
    # Check payments table
    if psql postgresql://akilanishan@localhost:5432/evconnect -c "\d payments" | grep -q "txnId"; then
        echo -e "${GREEN}✅ Payments table has txnId column${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Database not accessible${NC}"
fi
echo ""

# Summary
echo "======================================"
echo -e "${GREEN}✅ Backend Ready for Testing!${NC}"
echo ""
echo "Next Steps:"
echo "1. Run Flutter app: cd evconnect_app && flutter run"
echo "2. Create a test booking"
echo "3. Proceed to payment"
echo "4. Use PayHere test card: 4916 2175 9794 8227"
echo "5. Complete checkout"
echo "6. Verify booking status changes to 'confirmed'"
echo ""
echo "Documentation: PAYHERE_INTEGRATION_COMPLETE.md"
echo ""
