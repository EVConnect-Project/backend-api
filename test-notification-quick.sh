#!/bin/bash

echo "🧪 Quick Notification System Test"
echo "=================================="

# Wait for backend to be ready
echo "⏳ Waiting for backend..."
sleep 5

# Test 1: Check if notifications module is loaded
echo ""
echo "1️⃣ Testing /api/notifications/health endpoint..."
curl -s http://localhost:3000/api/notifications/health 2>/dev/null || echo "❌ Backend not responding"

echo ""
echo "✅ Test complete!"
