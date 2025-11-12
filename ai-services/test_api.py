"""
Test suite for EVConnect AI Services
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "EVConnect AI Services"
    assert response.json()["status"] == "running"

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_predict_route_success():
    """Test successful route prediction"""
    payload = {
        "start_lat": 37.7749,
        "start_lng": -122.4194,
        "end_lat": 34.0522,
        "end_lng": -118.2437,
        "battery_kwh": 75.0
    }
    
    response = client.post("/predict/route", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] is True
    assert data["total_distance_km"] > 0
    assert isinstance(data["charging_stops"], list)
    assert "model_version" in data

def test_predict_route_invalid_coordinates():
    """Test route prediction with invalid coordinates"""
    payload = {
        "start_lat": 100.0,  # Invalid latitude
        "start_lng": -122.4194,
        "end_lat": 34.0522,
        "end_lng": -118.2437,
        "battery_kwh": 75.0
    }
    
    response = client.post("/predict/route", json=payload)
    assert response.status_code == 422  # Validation error

def test_predict_route_short_distance():
    """Test route prediction with very short distance"""
    payload = {
        "start_lat": 37.7749,
        "start_lng": -122.4194,
        "end_lat": 37.7750,  # Very close
        "end_lng": -122.4195,
        "battery_kwh": 75.0
    }
    
    response = client.post("/predict/route", json=payload)
    assert response.status_code == 400  # Too close

def test_predict_route_zero_battery():
    """Test route prediction with invalid battery"""
    payload = {
        "start_lat": 37.7749,
        "start_lng": -122.4194,
        "end_lat": 34.0522,
        "end_lng": -118.2437,
        "battery_kwh": 0  # Invalid
    }
    
    response = client.post("/predict/route", json=payload)
    assert response.status_code == 422  # Validation error

def test_model_info():
    """Test model info endpoint"""
    response = client.get("/model/info")
    assert response.status_code == 200
    
    data = response.json()
    assert "model_type" in data
    assert "features" in data
    assert "predictions" in data

def test_predict_route_long_distance():
    """Test route prediction for long distance requiring multiple stops"""
    payload = {
        "start_lat": 47.6062,  # Seattle
        "start_lng": -122.3321,
        "end_lat": 32.7157,  # San Diego
        "end_lng": -117.1611,
        "battery_kwh": 60.0  # Smaller battery = more stops
    }
    
    response = client.post("/predict/route", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] is True
    assert len(data["charging_stops"]) > 0
    assert data["total_charging_time_minutes"] > 0

def test_predict_route_response_structure():
    """Test that response has all required fields"""
    payload = {
        "start_lat": 37.7749,
        "start_lng": -122.4194,
        "end_lat": 34.0522,
        "end_lng": -118.2437,
        "battery_kwh": 75.0
    }
    
    response = client.post("/predict/route", json=payload)
    data = response.json()
    
    # Check all required fields
    required_fields = [
        "success", "total_distance_km", "estimated_duration_hours",
        "charging_stops", "total_charging_time_minutes", 
        "total_cost_estimate_usd", "battery_status_at_destination",
        "model_version", "timestamp"
    ]
    
    for field in required_fields:
        assert field in data, f"Missing field: {field}"
    
    # Check charging stop structure
    if data["charging_stops"]:
        stop = data["charging_stops"][0]
        stop_fields = [
            "latitude", "longitude", "charger_id", "station_name",
            "power_kw", "estimated_charge_duration_minutes",
            "distance_from_start_km", "cost_estimate_usd", "confidence_score"
        ]
        for field in stop_fields:
            assert field in stop, f"Missing stop field: {field}"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
