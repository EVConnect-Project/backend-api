#!/bin/bash

# Phase 1 Critical UX Features - Verification Script
# This script verifies that all Phase 1 features have been properly implemented

echo "🔍 EVConnect Phase 1 Implementation Verification"
echo "================================================"
echo ""

cd "$(dirname "$0")/evconnect_app"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $2 - File not found: $1${NC}"
        ((FAILED++))
    fi
}

check_route() {
    if grep -q "$1" lib/main.dart; then
        echo -e "${GREEN}✅ Route: $1${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Route missing: $1${NC}"
        ((FAILED++))
    fi
}

check_dependency() {
    if grep -q "$1" pubspec.yaml; then
        echo -e "${GREEN}✅ Dependency: $1${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Dependency missing: $1${NC}"
        ((FAILED++))
    fi
}

echo "📁 Checking Feature Files..."
echo "----------------------------"
check_file "lib/screens/qr_scanner_screen.dart" "Feature 1: QR Scanner Screen"
check_file "lib/services/notification_service.dart" "Feature 2: Notification Service"
check_file "lib/screens/transaction_history_screen.dart" "Feature 5: Transaction History"
check_file "lib/screens/payment_methods_screen.dart" "Feature 4: Payment Methods"
check_file "lib/widgets/advanced_filters_bottom_sheet.dart" "Feature 6: Advanced Filters"
check_file "lib/widgets/photo_upload_widget.dart" "Feature 7: Photo Upload Widget"

echo ""
echo "🚏 Checking Routes..."
echo "---------------------"
check_route "/qr-scanner"
check_route "/transaction-history"
check_route "/payment-methods"

echo ""
echo "📦 Checking Dependencies..."
echo "---------------------------"
check_dependency "mobile_scanner"
check_dependency "firebase_core"
check_dependency "firebase_messaging"
check_dependency "flutter_local_notifications"
check_dependency "permission_handler"

echo ""
echo "🔧 Checking Integrations..."
echo "---------------------------"

# Check if navigation is integrated in charger detail screen
if grep -q "_openMapsNavigation" lib/screens/modern_charger_detail_screen.dart 2>/dev/null; then
    echo -e "${GREEN}✅ Feature 3: Navigate to Charger (integrated)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Feature 3: Navigate to Charger (not integrated)${NC}"
    ((FAILED++))
fi

# Check if photo upload is integrated in register charger screen
if grep -q "PhotoUploadWidget" lib/screens/register_charger_screen.dart 2>/dev/null; then
    echo -e "${GREEN}✅ Feature 7: Photo Upload (integrated in register screen)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Feature 7: Photo Upload (not integrated)${NC}"
    ((FAILED++))
fi

# Check if advanced filters are integrated in charger list
if grep -q "AdvancedFiltersBottomSheet" lib/screens/modern_charger_list_screen.dart 2>/dev/null; then
    echo -e "${GREEN}✅ Feature 6: Advanced Filters (integrated in list screen)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Feature 6: Advanced Filters (not integrated)${NC}"
    ((FAILED++))
fi

# Check if imports are added to main.dart
if grep -q "import 'screens/payment_methods_screen.dart'" lib/main.dart; then
    echo -e "${GREEN}✅ Import: PaymentMethodsScreen in main.dart${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Import missing: PaymentMethodsScreen${NC}"
    ((FAILED++))
fi

echo ""
echo "📊 Summary"
echo "=========="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All Phase 1 features are properly implemented!${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Configure Firebase (google-services.json, GoogleService-Info.plist)"
    echo "2. Run: flutter run -d <device>"
    echo "3. Test all 7 features"
    echo "4. Move to Phase 2 development"
    exit 0
else
    echo -e "${RED}❌ Some features are missing or not properly integrated.${NC}"
    echo "Please review the failed checks above."
    exit 1
fi
