#!/bin/bash

# EVConnect AI Services - Server Startup Script

echo "🚀 Starting EVConnect AI Services..."

# Navigate to ai-services directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "📥 Installing dependencies..."
pip install --quiet fastapi 'uvicorn[standard]' pydantic numpy scikit-learn joblib pandas

# Check if model exists
if [ ! -f "models/route_optimizer.pkl" ]; then
    echo "🤖 Training ML model..."
    python3 train_model.py
fi

# Start server
echo "✅ Starting FastAPI server on http://localhost:5000"
echo "📖 API docs: http://localhost:5000/docs"
echo ""
uvicorn main:app --reload --port 5000 --host 0.0.0.0
