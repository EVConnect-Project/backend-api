from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
from typing import List, Dict
import joblib
import os
from datetime import datetime

# Import trip planning module
from trip_planner import TripPlanRequest, TripPlan, trip_planner

app = FastAPI(
    title="EVConnect AI Services",
    description="ML-powered route optimization and charging stop prediction",
    version="1.0.0"
)

# CORS configuration for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model storage
ml_model = None
scaler = None
mechanic_model = None
mechanic_scaler = None

class RouteRequest(BaseModel):
    start_lat: float = Field(..., ge=-90, le=90, description="Starting latitude")
    start_lng: float = Field(..., ge=-180, le=180, description="Starting longitude")
    end_lat: float = Field(..., ge=-90, le=90, description="Destination latitude")
    end_lng: float = Field(..., ge=-180, le=180, description="Destination longitude")
    battery_kwh: float = Field(..., gt=0, le=200, description="Current battery capacity in kWh")
    
    class Config:
        json_schema_extra = {
            "example": {
                "start_lat": 37.7749,
                "start_lng": -122.4194,
                "end_lat": 34.0522,
                "end_lng": -118.2437,
                "battery_kwh": 75.0
            }
        }

class ChargingStop(BaseModel):
    latitude: float
    longitude: float
    charger_id: str
    station_name: str
    power_kw: float
    estimated_charge_duration_minutes: int
    distance_from_start_km: float
    cost_estimate_lkr: float
    confidence_score: float

class RouteResponse(BaseModel):
    success: bool
    total_distance_km: float
    estimated_duration_hours: float
    charging_stops: List[ChargingStop]
    total_charging_time_minutes: int
    total_cost_estimate_lkr: float
    battery_status_at_destination: float
    model_version: str
    timestamp: str

class MechanicFeatures(BaseModel):
    distance_km: float = Field(..., ge=0, description="Distance from user to mechanic in km")
    rating: float = Field(..., ge=0, le=5, description="Mechanic rating (0-5)")
    available: int = Field(..., ge=0, le=1, description="Is mechanic available (0 or 1)")
    service_match: float = Field(..., ge=0, le=1, description="Percentage of required services offered (0-1)")
    completed_jobs: int = Field(..., ge=0, description="Number of completed jobs")
    years_experience: float = Field(..., ge=0, description="Years of experience")
    urgency_level: int = Field(..., ge=0, le=3, description="0=low, 1=medium, 2=high, 3=critical")
    price_per_hour: float = Field(..., ge=0, description="Mechanic hourly rate")

class MechanicRankingRequest(BaseModel):
    mechanics: List[MechanicFeatures]

class MechanicScore(BaseModel):
    mechanic_index: int
    predicted_score: float
    confidence: float

class MechanicRankingResponse(BaseModel):
    success: bool
    scores: List[MechanicScore]
    model_version: str
    timestamp: str

class ChargerFeatures(BaseModel):
    charger_id: str = Field(..., description="Unique charger identifier")
    distance_km: float = Field(..., ge=0, description="Distance from user to charger in km")
    power_kw: float = Field(..., ge=0, description="Charger power rating in kW")
    available: int = Field(..., ge=0, le=1, description="Is charger available (0 or 1)")
    rating: float = Field(..., ge=0, le=5, description="Charger rating (0-5)")
    price_per_kwh: float = Field(..., ge=0, description="Price per kWh")
    access_type: str = Field(..., description="public, semi-public, or private")
    connector_type: str = Field(..., description="Connector type (Type 2, CCS, CHAdeMO, etc)")
    currently_in_use: int = Field(..., ge=0, le=1, description="Is currently in use (0 or 1)")

class ChargerRankingRequest(BaseModel):
    chargers: List[ChargerFeatures]
    user_battery_level: float = Field(default=50.0, ge=0, le=100, description="Current battery percentage")
    user_urgency: int = Field(default=1, ge=0, le=3, description="0=low, 1=medium, 2=high, 3=critical")

class ChargerScore(BaseModel):
    charger_id: str
    predicted_score: float
    confidence: float
    distance_km: float
    recommendation_reason: str

class ChargerRankingResponse(BaseModel):
    success: bool
    scores: List[ChargerScore]
    model_version: str
    timestamp: str

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on earth (in km)
    """
    R = 6371  # Radius of earth in kilometers
    
    lat1_rad = np.radians(lat1)
    lat2_rad = np.radians(lat2)
    delta_lat = np.radians(lat2 - lat1)
    delta_lon = np.radians(lon2 - lon1)
    
    a = np.sin(delta_lat/2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(delta_lon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    
    return R * c

def calculate_energy_consumption(distance_km: float, battery_kwh: float) -> float:
    """
    Estimate energy consumption based on distance and battery capacity
    Average EV consumption: 0.2 kWh per km
    """
    consumption_rate = 0.2  # kWh per km
    return distance_km * consumption_rate

def load_ml_model():
    """
    Load pre-trained ML model for charging stop prediction
    In production, this would load a trained TensorFlow/Scikit-learn model
    """
    global ml_model, scaler, mechanic_model, mechanic_scaler
    
    model_path = os.path.join(os.path.dirname(__file__), 'models', 'route_optimizer.pkl')
    scaler_path = os.path.join(os.path.dirname(__file__), 'models', 'scaler.pkl')
    mechanic_model_path = os.path.join(os.path.dirname(__file__), 'models', 'mechanic_ranker.pkl')
    mechanic_scaler_path = os.path.join(os.path.dirname(__file__), 'models', 'mechanic_scaler.pkl')
    
    # Load route optimizer
    try:
        if os.path.exists(model_path):
            ml_model = joblib.load(model_path)
            print("✓ Route optimizer model loaded successfully")
        else:
            print("⚠ Using mock route model - train and save model to models/route_optimizer.pkl")
            ml_model = None
            
        if os.path.exists(scaler_path):
            scaler = joblib.load(scaler_path)
            print("✓ Route scaler loaded successfully")
        else:
            print("⚠ Using mock route scaler")
            scaler = None
    except Exception as e:
        print(f"Error loading route model: {e}")
        ml_model = None
        scaler = None
    
    # Load mechanic ranking model
    try:
        if os.path.exists(mechanic_model_path):
            mechanic_model = joblib.load(mechanic_model_path)
            print("✓ Mechanic ranking model loaded successfully")
        else:
            print("⚠ Mechanic ranking model not found - run train_mechanic_model.py first")
            mechanic_model = None
            
        if os.path.exists(mechanic_scaler_path):
            mechanic_scaler = joblib.load(mechanic_scaler_path)
            print("✓ Mechanic scaler loaded successfully")
        else:
            print("⚠ Mechanic scaler not found")
            mechanic_scaler = None
    except Exception as e:
        print(f"Error loading mechanic model: {e}")
        mechanic_model = None
        mechanic_scaler = None

def predict_optimal_stops(
    start_lat: float, 
    start_lng: float, 
    end_lat: float, 
    end_lng: float, 
    battery_kwh: float
) -> List[Dict]:
    """
    Use ML model to predict optimal charging stops
    """
    total_distance = haversine_distance(start_lat, start_lng, end_lat, end_lng)
    energy_needed = calculate_energy_consumption(total_distance, battery_kwh)
    
    # Battery range with 20% buffer for safety
    max_range_km = (battery_kwh / 0.2) * 0.8
    
    # Determine number of stops needed
    num_stops = int(np.ceil(total_distance / max_range_km)) - 1
    num_stops = max(0, num_stops)  # At least 0 stops
    
    charging_stops = []
    
    if num_stops > 0:
        # Calculate stop positions along the route
        for i in range(1, num_stops + 1):
            # Interpolate position along route
            fraction = i / (num_stops + 1)
            
            stop_lat = start_lat + (end_lat - start_lat) * fraction
            stop_lng = start_lng + (end_lng - start_lng) * fraction
            
            # Add some randomness to simulate real charger locations
            stop_lat += np.random.uniform(-0.02, 0.02)
            stop_lng += np.random.uniform(-0.02, 0.02)
            
            distance_from_start = haversine_distance(start_lat, start_lng, stop_lat, stop_lng)
            
            # ML model features (if model exists)
            if ml_model is not None:
                features = np.array([[
                    stop_lat, stop_lng, distance_from_start, 
                    battery_kwh, total_distance, i
                ]])
                
                if scaler is not None:
                    features = scaler.transform(features)
                
                # Predict power_kw, duration, cost
                prediction = ml_model.predict(features)[0]
                power_kw = prediction[0]
                duration_minutes = prediction[1]
                cost_lkr = prediction[2]
                confidence = prediction[3] if len(prediction) > 3 else 0.85
            else:
                # Mock predictions based on heuristics
                power_kw = np.random.choice([50, 150, 250, 350])  # Different charger types
                charge_needed_kwh = battery_kwh * 0.6  # Charge to 80%
                duration_minutes = int((charge_needed_kwh / power_kw) * 60)
                cost_lkr = charge_needed_kwh * np.random.uniform(25, 50)  # LKR 25-50 per kWh
                confidence = 0.75
            
            charging_stops.append({
                "latitude": round(stop_lat, 6),
                "longitude": round(stop_lng, 6),
                "charger_id": f"CHG-{i:03d}-{int(stop_lat*1000)}",
                "station_name": f"Fast Charge Station {i}",
                "power_kw": round(power_kw, 1),
                "estimated_charge_duration_minutes": duration_minutes,
                "distance_from_start_km": round(distance_from_start, 2),
                "cost_estimate_lkr": round(cost_lkr, 2),
                "confidence_score": round(confidence, 3)
            })
    
    return charging_stops

@app.on_event("startup")
async def startup_event():
    """Initialize ML model on startup"""
    print("🚀 Starting EVConnect AI Services...")
    load_ml_model()
    print("✓ Server ready")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "EVConnect AI Services",
        "status": "running",
        "version": "1.0.0",
        "model_loaded": ml_model is not None,
        "endpoints": ["/predict/route", "/trip/plan", "/health", "/docs"]
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_status": "loaded" if ml_model is not None else "mock",
        "scaler_status": "loaded" if scaler is not None else "mock",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/trip/plan", response_model=TripPlan)
async def plan_trip(request: TripPlanRequest):
    """
    Create an AI-powered trip plan with optimal charging stops
    
    This endpoint analyzes your trip requirements and provides:
    - Optimal route with detailed segments
    - Smart charging stop recommendations
    - Battery consumption predictions
    - Weather-adjusted energy estimates
    - Safety alerts and recommendations
    
    Features:
    - Multi-stop route optimization
    - Real-time weather integration
    - Elevation-aware consumption calculation
    - Driving mode adjustment (eco/normal/sport)
    - Connector-type matching for chargers
    """
    try:
        trip_plan = await trip_planner.create_trip_plan(request)
        return trip_plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating trip plan: {str(e)}")

@app.post("/predict/route", response_model=RouteResponse)
async def predict_route(request: RouteRequest):
    """
    Predict optimal charging stops for a given route
    
    - **start_lat**: Starting latitude (-90 to 90)
    - **start_lng**: Starting longitude (-180 to 180)
    - **end_lat**: Destination latitude (-90 to 90)
    - **end_lng**: Destination longitude (-180 to 180)
    - **battery_kwh**: Current battery capacity in kWh (0 to 200)
    
    Returns optimal charging stops with estimated duration and costs
    """
    try:
        # Calculate total distance
        total_distance = haversine_distance(
            request.start_lat, request.start_lng,
            request.end_lat, request.end_lng
        )
        
        if total_distance < 1:
            raise HTTPException(
                status_code=400, 
                detail="Start and end points are too close (< 1 km)"
            )
        
        # Predict charging stops
        charging_stops = predict_optimal_stops(
            request.start_lat, request.start_lng,
            request.end_lat, request.end_lng,
            request.battery_kwh
        )
        
        # Calculate totals
        total_charging_time = sum(stop["estimated_charge_duration_minutes"] for stop in charging_stops)
        total_cost = sum(stop["cost_estimate_lkr"] for stop in charging_stops)
        
        # Estimate driving duration (assuming 80 km/h average speed)
        driving_hours = total_distance / 80
        charging_hours = total_charging_time / 60
        estimated_duration = driving_hours + charging_hours
        
        # Estimate battery at destination
        energy_consumed = calculate_energy_consumption(total_distance, request.battery_kwh)
        energy_added = len(charging_stops) * request.battery_kwh * 0.6  # Each stop charges 60%
        battery_at_destination = min(
            request.battery_kwh,
            request.battery_kwh - energy_consumed + energy_added
        )
        
        return RouteResponse(
            success=True,
            total_distance_km=round(total_distance, 2),
            estimated_duration_hours=round(estimated_duration, 2),
            charging_stops=charging_stops,
            total_charging_time_minutes=total_charging_time,
            total_cost_estimate_lkr=round(total_cost, 2),
            battery_status_at_destination=round(battery_at_destination, 2),
            model_version="1.0.0" if ml_model is None else "1.0.0-trained",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/model/info")
async def model_info():
    """Get information about the loaded ML model"""
    return {
        "route_optimizer": {
            "model_type": "Scikit-learn RandomForest" if ml_model else "Mock Model",
            "model_loaded": ml_model is not None,
            "scaler_loaded": scaler is not None,
        },
        "mechanic_ranker": {
            "model_type": "Gradient Boosting Regressor" if mechanic_model else "Not Loaded",
            "model_loaded": mechanic_model is not None,
            "scaler_loaded": mechanic_scaler is not None,
            "features": [
                "distance_km", "rating", "available", "service_match",
                "completed_jobs", "years_experience", "urgency_level", "price_per_hour"
            ] if mechanic_model else [],
        }
    }

@app.post("/predict/mechanic-ranking", response_model=MechanicRankingResponse)
async def predict_mechanic_ranking(request: MechanicRankingRequest):
    """
    AI-powered mechanic ranking using trained Gradient Boosting model
    
    Predicts selection scores for mechanics based on:
    - Distance from user
    - Mechanic rating
    - Availability
    - Service match
    - Experience (completed jobs)
    - Years of experience
    - Urgency level
    - Price per hour
    
    Returns predicted scores (0-100) indicating likelihood of user selection
    """
    try:
        if not request.mechanics:
            raise HTTPException(status_code=400, detail="No mechanics provided")
        
        # Prepare features
        features_list = []
        for mechanic in request.mechanics:
            features_list.append([
                mechanic.distance_km,
                mechanic.rating,
                mechanic.available,
                mechanic.service_match,
                mechanic.completed_jobs,
                mechanic.years_experience,
                mechanic.urgency_level,
                mechanic.price_per_hour
            ])
        
        features_array = np.array(features_list)
        
        # Use ML model if available
        if mechanic_model is not None and mechanic_scaler is not None:
            # Scale features
            features_scaled = mechanic_scaler.transform(features_array)
            
            # Predict scores
            predictions = mechanic_model.predict(features_scaled)
            
            # Calculate confidence based on prediction certainty
            # Higher scores = higher confidence
            confidences = np.clip(predictions / 100, 0, 1)
            
            model_version = "1.0.0-trained-gb"
        else:
            # Fallback: Rule-based scoring
            predictions = []
            confidences = []
            
            for features in features_list:
                score = 0.0
                # Distance (closer = better)
                score += (1 - min(features[0] / 50, 1)) * 30
                # Rating
                score += (features[1] / 5) * 25
                # Available
                score += features[2] * 20
                # Service match
                score += features[3] * 15
                # Jobs (capped at 200)
                score += (min(features[4], 200) / 200) * 10
                
                predictions.append(score)
                confidences.append(0.65)  # Lower confidence for rule-based
            
            predictions = np.array(predictions)
            confidences = np.array(confidences)
            model_version = "1.0.0-fallback"
        
        # Create response
        scores = [
            MechanicScore(
                mechanic_index=i,
                predicted_score=round(float(predictions[i]), 2),
                confidence=round(float(confidences[i]), 3)
            )
            for i in range(len(predictions))
        ]
        
        return MechanicRankingResponse(
            success=True,
            scores=scores,
            model_version=model_version,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/predict/charger-ranking", response_model=ChargerRankingResponse)
async def predict_charger_ranking(request: ChargerRankingRequest):
    """
    AI-powered charger ranking for real-time nearby stations
    
    Intelligently ranks chargers based on:
    - Distance from user (closer = better)
    - Charger availability (available > occupied)
    - Power rating (faster = better for urgent situations)
    - Price (lower = better, but balanced with other factors)
    - Rating (higher = better)
    - Access type (public > semi-public > private)
    - User's battery level and urgency
    
    Returns predicted scores (0-100) with ranking reasons
    """
    try:
        if not request.chargers:
            raise HTTPException(status_code=400, detail="No chargers provided")
        
        scores = []
        
        for charger in request.chargers:
            score = 0.0
            reasons = []
            
            # Distance factor (40% weight) - exponential decay
            # 0 km = 40, 5 km = 30, 10 km = 20, 20+ km = 5
            if charger.distance_km < 1:
                distance_score = 40
                reasons.append("Very close")
            elif charger.distance_km < 5:
                distance_score = 35 - (charger.distance_km * 2)
                reasons.append("Nearby")
            elif charger.distance_km < 10:
                distance_score = 25 - charger.distance_km
                reasons.append("Short drive")
            else:
                distance_score = max(5, 20 - charger.distance_km * 0.5)
                reasons.append("Moderate distance")
            
            score += distance_score
            
            # Availability (25% weight)
            if charger.available == 1 and charger.currently_in_use == 0:
                score += 25
                reasons.append("Available now")
            elif charger.available == 1:
                score += 15
                reasons.append("May be in use")
            else:
                score += 5
                reasons.append("Limited availability")
            
            # Power rating (15% weight) - adjusted by urgency
            # Fast chargers (150+ kW) get bonus when urgency is high
            power_factor = min(charger.power_kw / 350, 1) * 15
            if request.user_urgency >= 2 and charger.power_kw >= 150:
                power_factor *= 1.5  # Boost fast chargers for urgent needs
                reasons.append("Fast charging")
            elif charger.power_kw >= 50:
                reasons.append("Quick charging")
            score += power_factor
            
            # Rating (10% weight)
            score += (charger.rating / 5) * 10
            if charger.rating >= 4.5:
                reasons.append("Highly rated")
            
            # Price (5% weight) - inverse relationship
            # Assume average price is LKR 35/kWh
            price_factor = max(0, 5 - (charger.price_per_kwh - 0.40) * 10)
            score += price_factor
            if charger.price_per_kwh < 0.35:
                reasons.append("Great price")
            
            # Access type (5% weight)
            access_scores = {"public": 5, "semi-public": 3, "private": 1}
            score += access_scores.get(charger.access_type.lower(), 2)
            
            # Battery level adjustment - if low battery, prioritize closer stations
            if request.user_battery_level < 20:
                # Critical battery - heavily prioritize distance
                score = score * (1 + (1 - min(charger.distance_km / 10, 1)) * 0.3)
                if charger.distance_km < 3:
                    reasons.insert(0, "🔋 Critical - closest option")
            elif request.user_battery_level < 50:
                # Low battery - moderately prioritize distance
                score = score * (1 + (1 - min(charger.distance_km / 20, 1)) * 0.15)
            
            # Confidence calculation
            # Higher confidence for available chargers with good ratings closer by
            confidence = 0.7
            if charger.available == 1:
                confidence += 0.1
            if charger.rating >= 4.0:
                confidence += 0.1
            if charger.distance_km < 5:
                confidence += 0.1
            confidence = min(confidence, 1.0)
            
            # Create recommendation reason
            recommendation = " • ".join(reasons[:3])  # Top 3 reasons
            
            scores.append(ChargerScore(
                charger_id=charger.charger_id,
                predicted_score=round(float(score), 2),
                confidence=round(float(confidence), 3),
                distance_km=round(charger.distance_km, 2),
                recommendation_reason=recommendation
            ))
        
        # Sort by score (highest first)
        scores.sort(key=lambda x: x.predicted_score, reverse=True)
        
        return ChargerRankingResponse(
            success=True,
            scores=scores,
            model_version="1.0.0-realtime-ai",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)