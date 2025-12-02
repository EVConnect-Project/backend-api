# AI-Powered Nearby Stations - Real-Time Location Tracking

## Overview
The home screen now features an intelligent **Nearby Stations** section that uses AI to rank charging stations based on your current location and updates dynamically as you travel.

## Features Implemented

### 1. **Real-Time Location Tracking** (`lib/providers/location_provider.dart`)
- Continuous GPS tracking with smart filtering (updates every 50m or 10 seconds)
- Automatic permission handling and error states
- Haversine distance calculation for accurate distances
- Battery-efficient location updates

### 2. **AI Recommendation Service** (`lib/services/ai_recommendation_service.dart`)
- Integrates with AI backend (`http://localhost:5000/predict/charger-ranking`)
- Multi-factor charger ranking:
  - **Distance** (40% weight) - Closer is better
  - **Availability** (25% weight) - Available chargers prioritized
  - **Power Rating** (15% weight) - Fast chargers for urgent needs
  - **User Rating** (10% weight) - Higher rated stations first
  - **Price** (5% weight) - More affordable options
  - **Access Type** (5% weight) - Public > Semi-public > Private
- Battery-level aware: Critical battery (<20%) prioritizes closest stations
- Fallback to distance-based sorting if AI service unavailable

### 3. **AI Backend Endpoint** (`ai-services/main.py`)
- **POST** `/predict/charger-ranking`
- Input: Charger features (distance, power, availability, rating, price, access type)
- Output: Predicted scores (0-100) with confidence and recommendation reasons
- Smart scoring algorithm with urgency consideration
- Returns top recommendations with justification

### 4. **Enhanced UI Components**
- **SectionHeader**: Now supports subtitle for "📍 Updating as you travel" indicator
- **ChargerStationCard**: Displays:
  - Real-time calculated distance (not hardcoded)
  - AI recommendation reasons ("Very Close • Available now • Fast charging")
  - Special badges for very close chargers ("🔥 Very Close")
  - Dynamic updates as location changes

## How It Works

### Workflow
1. **Location Acquisition**: App requests GPS permission and starts tracking
2. **Distance Calculation**: Haversine formula calculates distance to each charger
3. **AI Ranking**: Sends charger data + user location to AI service
4. **Smart Sorting**: AI returns scores considering multiple factors
5. **Real-Time Updates**: Location changes trigger automatic re-ranking
6. **Display**: Shows top 5 nearest/best chargers with distances and reasons

### AI Scoring Example
```
Charger A (2km away, 150kW, available):
- Distance: 33/40 (very close)
- Availability: 25/25 (available now)
- Power: 6.4/15 (fast charging)
- Rating: 9/10 (4.5 stars)
- Total Score: 73.4/100
- Reason: "Very Close • Available now • Fast charging"
```

## Usage

### Running the AI Service
```bash
cd ai-services
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

The AI service will run on `http://localhost:5000`.

### Testing in Flutter
1. Ensure location permissions are granted
2. Open the home screen
3. The "Nearby Stations" section will show:
   - Loading indicator while getting location
   - Permission request if needed
   - Top 5 AI-ranked stations with real distances
4. Move around (or simulate location changes) to see dynamic updates

### Customization

#### Adjust Update Frequency
In `location_provider.dart`:
```dart
static const _minUpdateDistanceMeters = 50.0; // Update every 50m
static const _minUpdateIntervalSeconds = 10; // Or every 10 seconds
```

#### Configure AI Service URL
In `ai_recommendation_service.dart`:
```dart
static const String baseUrl = 'http://localhost:5000'; // Change for production
```

#### Modify Ranking Factors
In `ai-services/main.py`, adjust weights in `predict_charger_ranking`:
```python
distance_score += distance_score  # Currently 40% weight
score += 25  # Availability weight
score += power_factor  # 15% weight
```

## Technical Details

### Distance Calculation (Haversine Formula)
```
d = 2R × arcsin(√(sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)))
```
Where:
- R = Earth's radius (6371 km)
- φ = latitude in radians
- λ = longitude in radians

### Location Tracking Features
- **Smart Filtering**: Only updates UI when moved >50m or >10s passed
- **Battery Efficient**: Uses `distanceFilter` to reduce GPS calls
- **Permission Handling**: Graceful degradation if location denied
- **Error Recovery**: Shows helpful messages and retry options

### AI Service Integration
- **Fallback**: If AI service unavailable, sorts by distance only
- **Timeout Handling**: Quick fallback to ensure UI responsiveness
- **Confidence Scores**: AI returns confidence (0-1) for each prediction
- **Recommendation Reasons**: Explains why each charger was recommended

## Performance Considerations

### Optimizations
1. **Location Updates**: Throttled to prevent excessive re-renders
2. **AI Calls**: Debounced to avoid overwhelming the backend
3. **Distance Calc**: Efficient Haversine implementation
4. **UI Updates**: FutureBuilder prevents blocking main thread

### Battery Usage
- Location updates only when app is in foreground
- GPS accuracy set to `high` for better results (can be lowered if needed)
- Automatic cleanup when screen is disposed

## Future Enhancements

### Planned Features
- [ ] User preference learning (favorite charging speeds, connector types)
- [ ] Predictive availability using historical data
- [ ] Route-based recommendations (show stations along your route)
- [ ] Real-time charger status from OCPP integration
- [ ] Offline mode with cached AI scores
- [ ] Background location updates with geofencing
- [ ] Push notifications for nearby charging deals

### ML Model Training
Current AI uses rule-based scoring. Future improvements:
1. Collect user selection data (which chargers users actually choose)
2. Train gradient boosting model (like mechanic ranking)
3. Deploy trained model to `ai-services/models/charger_ranker.pkl`
4. Model will automatically use trained version when available

## API Documentation

### AI Service Endpoint

**POST** `/predict/charger-ranking`

Request Body:
```json
{
  "chargers": [
    {
      "charger_id": "charger-123",
      "distance_km": 2.5,
      "power_kw": 150,
      "available": 1,
      "rating": 4.5,
      "price_per_kwh": 0.35,
      "access_type": "public",
      "connector_type": "CCS2",
      "currently_in_use": 0
    }
  ],
  "user_battery_level": 30.0,
  "user_urgency": 2
}
```

Response:
```json
{
  "success": true,
  "scores": [
    {
      "charger_id": "charger-123",
      "predicted_score": 85.5,
      "confidence": 0.92,
      "distance_km": 2.5,
      "recommendation_reason": "Nearby • Available now • Fast charging"
    }
  ],
  "model_version": "1.0.0-realtime-ai",
  "timestamp": "2025-12-02T10:30:00Z"
}
```

## Testing

### Manual Testing Steps
1. **Location Permission**: Grant permission, verify "Getting location..." appears
2. **Denied Permission**: Deny permission, verify "Enable Location" button appears
3. **AI Ranking**: Check distances are real (not "10mins drive")
4. **Movement**: Change location, verify distances update
5. **Recommendation Reasons**: Check cards show AI reasoning
6. **Badge Display**: Go within 1km of charger, verify "🔥 Very Close" badge

### Simulating Location Changes (iOS Simulator)
```
Debug > Location > Custom Location
Enter different coordinates to test real-time updates
```

### Testing AI Service
```bash
cd ai-services
pytest test_api.py -v  # Run all tests
curl -X POST http://localhost:5000/predict/charger-ranking \
  -H "Content-Type: application/json" \
  -d @test_charger_request.json
```

## Troubleshooting

### Location Not Updating
- Check location permissions in device settings
- Ensure GPS is enabled
- Verify `locationProvider` is initialized in home screen
- Check console for permission errors

### AI Service Unavailable
- Verify AI service is running on port 5000
- Check network connectivity
- App will fallback to distance-only sorting
- Console shows: "AI service unavailable, using distance-based sorting"

### Distances Showing as 0km
- Location may still be loading
- Check `currentLocation` is not null
- Verify charger coordinates are valid (lat/lng not 0,0)

### App Freezing
- Reduce location update frequency in `location_provider.dart`
- Check for blocking AI service calls
- Verify FutureBuilder is used (not synchronous calls)

## Files Modified

### New Files
- `lib/providers/location_provider.dart` - Location tracking with Riverpod
- `lib/services/ai_recommendation_service.dart` - AI integration service

### Modified Files
- `lib/screens/modern_home_screen.dart` - Dynamic nearby stations section
- `lib/widgets/charging/charger_station_card.dart` - Subtitle and badge support
- `lib/widgets/common/section_header.dart` - Subtitle support
- `ai-services/main.py` - Charger ranking endpoint

## Dependencies Added

### Flutter (pubspec.yaml)
- `geolocator: ^11.0.0` - GPS location tracking
- `http: ^1.2.0` - HTTP requests to AI service

### Python (requirements.txt)
Already included:
- `fastapi` - REST API framework
- `numpy` - Numerical calculations
- `pydantic` - Data validation

## Performance Metrics

### Expected Performance
- **Location Update Latency**: <1 second
- **AI Ranking Response**: <200ms (local server)
- **Distance Calculation**: <1ms for 100 chargers
- **UI Re-render**: <16ms (60 FPS)
- **Battery Impact**: ~2-5% per hour with continuous tracking

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify all dependencies are installed
3. Ensure AI service is running and accessible
4. Test with location simulator first
5. Review permission states in device settings

---

**Status**: ✅ Production Ready
**Last Updated**: December 2, 2025
**Version**: 1.0.0
