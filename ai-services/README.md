# EVConnect AI Services

FastAPI-based ML service for optimal EV charging route prediction.

## Features

- **Route Optimization**: Predict optimal charging stops based on distance and battery capacity
- **ML-Powered**: Uses Random Forest model (Scikit-learn) for intelligent predictions
- **REST API**: Clean FastAPI endpoints with automatic OpenAPI documentation
- **CORS Enabled**: Ready for frontend integration

## Endpoints

### `POST /predict/route`
Predict optimal charging stops for a given route.

**Request Body:**
```json
{
  "start_lat": 37.7749,
  "start_lng": -122.4194,
  "end_lat": 34.0522,
  "end_lng": -118.2437,
  "battery_kwh": 75.0
}
```

**Response:**
```json
{
  "success": true,
  "total_distance_km": 559.12,
  "estimated_duration_hours": 8.5,
  "charging_stops": [
    {
      "latitude": 36.1234,
      "longitude": -120.5678,
      "charger_id": "CHG-001-36123",
      "station_name": "Fast Charge Station 1",
      "power_kw": 250.0,
      "estimated_charge_duration_minutes": 25,
      "distance_from_start_km": 279.56,
      "cost_estimate_usd": 12.50,
      "confidence_score": 0.875
    }
  ],
  "total_charging_time_minutes": 25,
  "total_cost_estimate_usd": 12.50,
  "battery_status_at_destination": 68.5,
  "model_version": "1.0.0-trained",
  "timestamp": "2025-11-13T10:30:00.000000"
}
```

### `GET /health`
Health check endpoint

### `GET /model/info`
Get information about the loaded ML model

## Installation

1. **Create virtual environment:**
```bash
cd ai-services
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Train the ML model:**
```bash
python train_model.py
```

This will:
- Generate synthetic training data (10,000 samples)
- Train a Random Forest model
- Save model to `models/route_optimizer.pkl`
- Save scaler to `models/scaler.pkl`

4. **Start the server:**
```bash
python main.py
```

Or use uvicorn directly:
```bash
uvicorn main:app --reload --port 5000
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

## Architecture

### ML Model
- **Algorithm**: Random Forest Regressor (Scikit-learn)
- **Features**: latitude, longitude, distance_from_start, battery_capacity, total_distance, stop_number
- **Predictions**: power_kw, duration_minutes, cost_usd, confidence_score
- **Training Data**: 10,000 synthetic samples (replace with real data in production)

### Energy Calculation
- **Consumption Rate**: 0.2 kWh per km (industry average)
- **Safety Buffer**: 20% battery reserve
- **Charging Strategy**: Charge to 80% at each stop

### Distance Calculation
Uses Haversine formula for great circle distance between GPS coordinates.

## Integration with Flutter App

Update your Flutter `trip_planner_screen.dart` to call this endpoint:

```dart
final response = await dio.post(
  'http://localhost:5000/predict/route',
  data: {
    'start_lat': startLat,
    'start_lng': startLng,
    'end_lat': endLat,
    'end_lng': endLng,
    'battery_kwh': batteryCapacity,
  },
);

final chargingStops = response.data['charging_stops'];
```

## Production Deployment

1. **Environment Variables:**
```bash
export ML_MODEL_PATH=/path/to/model.pkl
export API_PORT=5000
export CORS_ORIGINS=https://yourfrontend.com
```

2. **Docker:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
```

3. **Train with Real Data:**
Replace synthetic data in `train_model.py` with historical route data:
- User routes and charging patterns
- Actual charger locations and availability
- Real-time traffic and weather data
- Energy consumption data from vehicles

## Model Improvements

Future enhancements:
- **TensorFlow/Neural Networks**: For more complex patterns
- **Real-time Data**: Traffic, weather, charger availability
- **User Preferences**: Preferred charger networks, stop duration
- **Cost Optimization**: Balance time vs. cost
- **Range Anxiety**: Psychological factors in stop placement

## Testing

Test the endpoint with curl:
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

## Dependencies

- **FastAPI**: Modern web framework
- **Uvicorn**: ASGI server
- **Scikit-learn**: ML algorithms
- **NumPy**: Numerical computing
- **Pandas**: Data manipulation
- **Joblib**: Model serialization
- **TensorFlow**: Deep learning (optional)

## License

MIT
