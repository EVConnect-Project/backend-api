#!/bin/bash

# EVConnect - Pre-Deployment Checklist Script
# Run this script to verify your deployment is ready

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 EVConnect Deployment Readiness Check"
echo "========================================"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Docker and Docker Compose
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    echo -e "${GREEN}✓${NC} Found Docker $DOCKER_VERSION"
else
    echo -e "${RED}✗${NC} Docker not found"
    ((ERRORS++))
fi

echo -n "Checking Docker Compose... "
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker Compose found"
else
    echo -e "${RED}✗${NC} Docker Compose not found"
    ((ERRORS++))
fi

# Check 2: Environment Files
echo ""
echo "Checking environment files..."

if [ -f "../backend-api/evconnect_backend/.env" ]; then
    echo -e "${GREEN}✓${NC} Backend .env exists"
    
    # Check for default values
    if grep -q "your_super_secret" "../backend-api/evconnect_backend/.env"; then
        echo -e "  ${YELLOW}⚠${NC} Warning: Default JWT_SECRET detected"
        ((WARNINGS++))
    fi
    
    if grep -q "sk_test_" "../backend-api/evconnect_backend/.env"; then
        echo -e "  ${YELLOW}⚠${NC} Warning: Stripe test key detected"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} Backend .env missing"
    echo "  Run: cp ../backend-api/evconnect_backend/.env.example ../backend-api/evconnect_backend/.env"
    ((ERRORS++))
fi

if [ -f "../ai-services/.env" ]; then
    echo -e "${GREEN}✓${NC} AI Services .env exists"
else
    echo -e "${RED}✗${NC} AI Services .env missing"
    echo "  Run: cp ../ai-services/.env.example ../ai-services/.env"
    ((ERRORS++))
fi

if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} Infrastructure .env exists"
else
    echo -e "${RED}✗${NC} Infrastructure .env missing"
    echo "  Run: cp .env.example .env"
    ((ERRORS++))
fi

# Check 3: Dockerfiles
echo ""
echo "Checking Dockerfiles..."

if [ -f "../backend-api/evconnect_backend/Dockerfile" ]; then
    echo -e "${GREEN}✓${NC} Backend Dockerfile exists"
else
    echo -e "${RED}✗${NC} Backend Dockerfile missing"
    ((ERRORS++))
fi

if [ -f "../ai-services/Dockerfile" ]; then
    echo -e "${GREEN}✓${NC} AI Services Dockerfile exists"
else
    echo -e "${RED}✗${NC} AI Services Dockerfile missing"
    ((ERRORS++))
fi

# Check 4: Nginx Configuration
echo ""
echo "Checking Nginx configuration..."

if [ -f "nginx/nginx.conf" ]; then
    echo -e "${GREEN}✓${NC} nginx.conf exists"
else
    echo -e "${RED}✗${NC} nginx.conf missing"
    ((ERRORS++))
fi

if [ -f "nginx/conf.d/evconnect.conf" ] || [ -f "nginx/conf.d/evconnect-dev.conf.example" ]; then
    echo -e "${GREEN}✓${NC} Site configuration exists"
else
    echo -e "${RED}✗${NC} Site configuration missing"
    ((ERRORS++))
fi

# Check 5: Database Initialization
echo ""
echo "Checking database initialization..."

if [ -f "init-db.sql" ]; then
    echo -e "${GREEN}✓${NC} init-db.sql exists"
else
    echo -e "${RED}✗${NC} init-db.sql missing"
    ((ERRORS++))
fi

# Check 6: SSL Certificates (for production)
echo ""
echo "Checking SSL certificates..."

if [ -d "certs/live" ] && [ "$(ls -A certs/live 2>/dev/null)" ]; then
    echo -e "${GREEN}✓${NC} SSL certificates found"
elif [ -f "nginx/conf.d/evconnect.conf" ]; then
    echo -e "${YELLOW}⚠${NC} Production nginx config exists but no SSL certificates"
    echo "  For development: Use evconnect-dev.conf.example"
    echo "  For production: Generate SSL certificates (see certs/README.md)"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} Development mode (no SSL required)"
fi

# Check 7: Port Availability
echo ""
echo "Checking port availability..."

check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":$port .*LISTEN"; then
        echo -e "${YELLOW}⚠${NC} Port $port ($service) is in use"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} Port $port ($service) is available"
    fi
}

check_port 80 "HTTP"
check_port 443 "HTTPS"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"

# Check 8: Required Backend Dependencies
echo ""
echo "Checking backend dependencies..."

if [ -f "../backend-api/evconnect_backend/package.json" ]; then
    echo -e "${GREEN}✓${NC} Backend package.json exists"
    
    # Check for NestJS dependencies
    if grep -q "@nestjs/core" "../backend-api/evconnect_backend/package.json"; then
        echo -e "  ${GREEN}✓${NC} NestJS found"
    else
        echo -e "  ${RED}✗${NC} NestJS not found in dependencies"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} Backend package.json missing"
    ((ERRORS++))
fi

# Check 9: Required AI Dependencies
echo ""
echo "Checking AI service dependencies..."

if [ -f "../ai-services/requirements.txt" ]; then
    echo -e "${GREEN}✓${NC} requirements.txt exists"
    
    if grep -q "fastapi" "../ai-services/requirements.txt"; then
        echo -e "  ${GREEN}✓${NC} FastAPI found"
    else
        echo -e "  ${YELLOW}⚠${NC} FastAPI not found in requirements.txt"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} requirements.txt missing"
    ((ERRORS++))
fi

# Summary
echo ""
echo "========================================"
echo "Summary:"
echo "--------"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to deploy.${NC}"
    echo ""
    echo "Run: ./setup.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found. Review before deploying.${NC}"
    echo ""
    echo "You can proceed with: ./setup.sh"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found.${NC}"
    echo ""
    echo "Please fix the errors before deploying."
    exit 1
fi
