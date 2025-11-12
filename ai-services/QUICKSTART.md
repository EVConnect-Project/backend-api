# EVConnect AI Services - Quick Start

## 🚀 Start the Server

### Option 1: Using the startup script (Recommended)
```bash
cd /Users/akilanishan/Documents/EVConnect-Project/ai-services
./start_server.sh
```

### Option 2: Manual startup
```bash
cd /Users/akilanishan/Documents/EVConnect-Project/ai-services
python3 -m venv venv
source venv/bin/activate
pip install fastapi 'uvicorn[standard]' pydantic numpy scikit-learn joblib pandas
python3 train_model.py  # Train model if not already trained
uvicorn main:app --reload --port 5000
```

## 📡 Test the API

Once the server is running, you'll see:
```
INFO:     Uvicorn running on http://0.0.0.0:5000
INFO:     Application startup complete
```

### Test with curl:
```bash
curl -X POST http://localhost:5000/predict/route \
  -H "Content-Type: application/json" \
  -d '{
    "start_lat": 37.7749,
    "start_lng": -122.4194,
    "end_lat": 34.0522,
    "end_lng": -118.2437,
    "battery_kwh": 75.0
  }'
```

### Or visit the interactive docs:
- Swagger UI: http://localhost:5000/docs
- ReDoc: http://localhost:5000/redoc

## 🧪 Run Tests

```bash
cd /Users/akilanishan/Documents/EVConnect-Project/ai-services
source venv/bin/activate
pip install pytest httpx
pytest test_api.py -v
```

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/predict/route` | POST | Predict charging stops |
| `/model/info` | GET | Model information |
| `/docs` | GET | Swagger UI docs |

## 🔗 Integration with Flutter

Add this to your Flutter app:

```dart
import 'package:dio/dio.dart';

Future<Map<String, dynamic>> predictRoute({
  required double startLat,
  required double startLng,
  required double endLat,
  required double endLng,
  required double batteryKwh,
}) async {
  final dio = Dio();
  
  try {
    final response = await dio.post(
      'http://localhost:5000/predict/route',
      data: {
        'start_lat': startLat,
        'start_lng': startLng,
        'end_lat': endLat,
        'end_lng': endLng,
        'battery_kwh': batteryKwh,
      },
    );
    
    return response.data;
  } catch (e) {
    throw Exception('Failed to predict route: $e');
  }
}
```

## 🛑 Stop the Server

Press `Ctrl+C` in the terminal where the server is running.

## 📝 Environment Variables (Optional)

Create a `.env` file:
```bash
API_PORT=5000
API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
MODEL_PATH=models/route_optimizer.pkl
```

## 🐛 Troubleshooting

### Port already in use
```bash
lsof -ti:5000 | xargs kill -9
```

### Module not found
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Model not found
```bash
python3 train_model.py
```

## 📦 Project Structure

```
ai-services/
├── main.py                 # FastAPI application
├── train_model.py          # ML model training
├── test_api.py            # API tests
├── requirements.txt       # Python dependencies
├── start_server.sh        # Startup script
├── README.md             # Full documentation
├── QUICKSTART.md         # This file
├── models/               # Trained models
│   ├── route_optimizer.pkl
│   └── scaler.pkl
└── venv/                 # Virtual environment
```
