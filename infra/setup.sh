#!/bin/bash

# EVConnect Infrastructure Quick Start Script
# This script helps you get the infrastructure up and running quickly

set -e

echo "🚀 EVConnect Infrastructure Setup"
echo "=================================="
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check for .env files
echo "📝 Checking environment files..."
if [ ! -f "../evconnect_backend/.env" ]; then
    echo "⚠️  Backend .env not found. Creating from example..."
    if [ -f "../evconnect_backend/.env.example" ]; then
        cp ../evconnect_backend/.env.example ../evconnect_backend/.env
        echo "✅ Created backend .env - please configure it before starting"
    else
        echo "❌ .env.example not found in evconnect_backend/"
        exit 1
    fi
fi

if [ ! -f "../ai-services/.env" ]; then
    echo "⚠️  AI services .env not found. Creating from example..."
    if [ -f "../ai-services/.env.example" ]; then
        cp ../ai-services/.env.example ../ai-services/.env
        echo "✅ Created AI services .env"
    fi
fi

echo ""

# Ask user for dev or prod mode
echo "🔧 Configuration Mode:"
echo "1) Development (HTTP, no SSL)"
echo "2) Production (HTTPS, requires SSL certs)"
read -p "Select mode (1 or 2): " mode

if [ "$mode" = "1" ]; then
    echo ""
    echo "📦 Setting up for Development..."
    
    # Use dev nginx config
    if [ -f "nginx/conf.d/evconnect-dev.conf.example" ]; then
        cp nginx/conf.d/evconnect-dev.conf.example nginx/conf.d/evconnect.conf
        echo "✅ Copied development nginx config"
    fi
    
    echo ""
    echo "🐳 Starting services..."
    docker-compose up -d
    
    echo ""
    echo "⏳ Waiting for services to be healthy..."
    sleep 10
    
    echo ""
    echo "✅ Services started!"
    echo ""
    echo "📍 Access Points:"
    echo "   - Backend API: http://localhost/api/"
    echo "   - AI Services: http://localhost/planner/"
    echo "   - WebSocket: ws://localhost/chargers/"
    echo "   - Health Check: http://localhost/health"
    echo ""
    
elif [ "$mode" = "2" ]; then
    echo ""
    echo "🔐 Setting up for Production..."
    
    # Check for SSL certificates
    if [ ! -d "certs/live" ] && [ ! -f "certs/fullchain.pem" ]; then
        echo ""
        echo "⚠️  SSL certificates not found!"
        echo "Please set up SSL certificates first. See certs/README.md"
        echo ""
        read -p "Do you want to generate self-signed certificates for testing? (y/n): " gen_cert
        
        if [ "$gen_cert" = "y" ]; then
            echo "Generating self-signed certificates..."
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout certs/privkey.pem \
                -out certs/fullchain.pem \
                -subj "/C=US/ST=State/L=City/O=EVConnect/CN=localhost"
            echo "✅ Self-signed certificates generated"
        else
            echo "❌ SSL certificates required for production mode"
            exit 1
        fi
    fi
    
    # Check if domain is configured
    if grep -q "example.com" nginx/conf.d/evconnect.conf 2>/dev/null; then
        echo ""
        echo "⚠️  Default domain detected in nginx config"
        echo "Please update nginx/conf.d/evconnect.conf with your domain name"
        echo ""
        read -p "Press Enter to continue anyway or Ctrl+C to exit..."
    fi
    
    echo ""
    echo "🐳 Starting services..."
    docker-compose up -d
    
    echo ""
    echo "⏳ Waiting for services to be healthy..."
    sleep 10
    
    echo ""
    echo "✅ Services started!"
    echo ""
    echo "📍 Access Points:"
    echo "   - Backend API: https://yourdomain.com/api/"
    echo "   - AI Services: https://yourdomain.com/planner/"
    echo "   - WebSocket: wss://yourdomain.com/chargers/"
    echo "   - Health Check: https://yourdomain.com/health"
    echo ""
    
else
    echo "Invalid selection. Exiting."
    exit 1
fi

# Show service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "📝 Useful Commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart: docker-compose restart"
echo "   - Check health: curl http://localhost/health"
echo ""
echo "🎉 Setup complete!"
