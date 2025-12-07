"""
Trip Planning Module - AI-powered route optimization and charging stop calculation
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import requests
import math
import os
from enum import Enum


class DrivingMode(str, Enum):
    ECO = "eco"
    NORMAL = "normal"
    SPORT = "sport"


class WeatherCondition(str, Enum):
    CLEAR = "clear"
    RAIN = "rain"
    SNOW = "snow"
    CLOUDY = "cloudy"


class TripPlanRequest(BaseModel):
    """Request model for trip planning"""
    # Route information
    origin: Dict[str, float] = Field(..., description="Origin coordinates {lat, lng}")
    destination: Dict[str, float] = Field(..., description="Destination coordinates {lat, lng}")
    waypoints: Optional[List[Dict[str, float]]] = Field(default=None, description="Optional waypoints")
    
    # Vehicle information
    vehicle_id: str = Field(..., description="Vehicle ID")
    battery_capacity: float = Field(..., gt=0, description="Total battery capacity in kWh")
    current_battery_level: float = Field(..., ge=0, le=100, description="Current battery percentage")
    average_consumption: float = Field(..., gt=0, description="Average consumption in Wh/km")
    efficiency: float = Field(..., gt=0, description="Vehicle efficiency in km/kWh")
    driving_mode: DrivingMode = Field(default=DrivingMode.NORMAL)
    connector_type: str = Field(..., description="Charging connector type")
    
    # Preferences
    preferred_charger_types: Optional[List[str]] = Field(default=None, description="Preferred charger networks")
    max_charging_stops: Optional[int] = Field(default=3, ge=1, le=10)
    min_battery_threshold: float = Field(default=20.0, ge=5, le=50, description="Minimum battery % before charging")
    target_battery_at_stop: float = Field(default=80.0, ge=50, le=100, description="Target battery % at charging stops")
    
    class Config:
        json_schema_extra = {
            "example": {
                "origin": {"lat": 6.9271, "lng": 79.8612},
                "destination": {"lat": 7.2906, "lng": 80.6337},
                "vehicle_id": "vehicle-123",
                "battery_capacity": 75.0,
                "current_battery_level": 85.0,
                "average_consumption": 180.0,
                "efficiency": 5.5,
                "driving_mode": "normal",
                "connector_type": "CCS",
                "min_battery_threshold": 20.0,
                "target_battery_at_stop": 80.0
            }
        }


class ChargingStop(BaseModel):
    """Model for a charging stop along the route"""
    charger_id: str
    name: str
    location: Dict[str, float]
    distance_from_origin: float = Field(..., description="Distance from trip origin in km")
    arrival_battery: float = Field(..., description="Estimated battery % on arrival")
    departure_battery: float = Field(..., description="Target battery % on departure")
    charging_time: float = Field(..., description="Estimated charging time in minutes")
    charging_power: float = Field(..., description="Charging power in kW")
    cost_estimate: Optional[float] = Field(default=None, description="Estimated charging cost")
    arrival_time: Optional[str] = Field(default=None, description="Estimated arrival time")


class RouteSegment(BaseModel):
    """Model for a segment of the route"""
    segment_index: int
    start_location: Dict[str, float]
    end_location: Dict[str, float]
    distance: float = Field(..., description="Segment distance in km")
    duration: float = Field(..., description="Estimated duration in minutes")
    energy_consumption: float = Field(..., description="Estimated energy consumption in kWh")
    elevation_gain: Optional[float] = Field(default=None, description="Elevation gain in meters")
    weather_condition: Optional[str] = Field(default=None)
    has_charging_stop: bool = False
    charging_stop: Optional[ChargingStop] = None


class SafetyAlert(BaseModel):
    """Safety alerts for the trip"""
    type: str = Field(..., description="Alert type: low_battery, extreme_weather, etc.")
    severity: str = Field(..., description="low, medium, high, critical")
    message: str
    location: Optional[Dict[str, float]] = None


class TripPlan(BaseModel):
    """Complete trip plan response"""
    trip_id: str
    total_distance: float = Field(..., description="Total distance in km")
    total_duration: float = Field(..., description="Total duration in minutes")
    total_energy_required: float = Field(..., description="Total energy required in kWh")
    charging_stops: List[ChargingStop]
    route_segments: List[RouteSegment]
    safety_alerts: List[SafetyAlert]
    estimated_arrival_battery: float = Field(..., description="Estimated battery % at destination")
    route_polyline: Optional[str] = Field(default=None, description="Encoded polyline for map display")
    created_at: str


class TripPlanner:
    """Main trip planning logic"""
    
    def __init__(self):
        self.google_maps_api_key = os.getenv('GOOGLE_MAPS_API_KEY', '')
        self.openweather_api_key = os.getenv('OPENWEATHER_API_KEY', '')
        self.driving_mode_multipliers = {
            DrivingMode.ECO: 0.85,      # 15% less consumption
            DrivingMode.NORMAL: 1.0,     # Normal consumption
            DrivingMode.SPORT: 1.25      # 25% more consumption
        }
    
    def calculate_distance(self, coord1: Dict[str, float], coord2: Dict[str, float]) -> float:
        """Calculate distance between two coordinates using Haversine formula"""
        lat1, lon1 = math.radians(coord1['lat']), math.radians(coord1['lng'])
        lat2, lon2 = math.radians(coord2['lat']), math.radians(coord2['lng'])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth's radius in kilometers
        radius = 6371
        return radius * c
    
    def get_route_from_google(self, origin: Dict[str, float], destination: Dict[str, float], 
                             waypoints: Optional[List[Dict[str, float]]] = None) -> Optional[Dict]:
        """Get route details from Google Maps Directions API"""
        if not self.google_maps_api_key:
            return None
        
        base_url = "https://maps.googleapis.com/maps/api/directions/json"
        
        params = {
            "origin": f"{origin['lat']},{origin['lng']}",
            "destination": f"{destination['lat']},{destination['lng']}",
            "key": self.google_maps_api_key,
            "alternatives": "false",
            "mode": "driving"
        }
        
        if waypoints:
            waypoints_str = "|".join([f"{wp['lat']},{wp['lng']}" for wp in waypoints])
            params["waypoints"] = waypoints_str
        
        try:
            response = requests.get(base_url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'OK':
                    return data['routes'][0]
        except Exception as e:
            print(f"Error fetching Google Maps route: {e}")
        
        return None
    
    def get_elevation_data(self, locations: List[Dict[str, float]]) -> List[float]:
        """Get elevation data for locations using Google Elevation API"""
        if not self.google_maps_api_key or not locations:
            return [0.0] * len(locations)
        
        base_url = "https://maps.googleapis.com/maps/api/elevation/json"
        
        locations_str = "|".join([f"{loc['lat']},{loc['lng']}" for loc in locations])
        
        params = {
            "locations": locations_str,
            "key": self.google_maps_api_key
        }
        
        try:
            response = requests.get(base_url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'OK':
                    return [result['elevation'] for result in data['results']]
        except Exception as e:
            print(f"Error fetching elevation data: {e}")
        
        return [0.0] * len(locations)
    
    def get_weather_forecast(self, location: Dict[str, float]) -> Optional[Dict]:
        """Get weather forecast for a location using OpenWeather API"""
        if not self.openweather_api_key:
            return None
        
        base_url = "https://api.openweathermap.org/data/2.5/weather"
        
        params = {
            "lat": location['lat'],
            "lon": location['lng'],
            "appid": self.openweather_api_key,
            "units": "metric"
        }
        
        try:
            response = requests.get(base_url, params=params, timeout=10)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Error fetching weather data: {e}")
        
        return None
    
    def calculate_energy_consumption(self, distance_km: float, base_consumption: float, 
                                   driving_mode: DrivingMode, weather: Optional[str] = None,
                                   elevation_gain: float = 0.0) -> float:
        """Calculate energy consumption for a segment considering various factors"""
        
        # Base consumption adjusted for driving mode
        mode_multiplier = self.driving_mode_multipliers[driving_mode]
        consumption = (distance_km * base_consumption / 1000.0) * mode_multiplier  # Convert Wh/km to kWh
        
        # Weather impact
        weather_multiplier = 1.0
        if weather:
            weather_map = {
                'rain': 1.1,      # 10% more consumption in rain
                'snow': 1.25,     # 25% more in snow
                'clear': 0.95     # 5% less in perfect conditions
            }
            weather_multiplier = weather_map.get(weather.lower(), 1.0)
        
        consumption *= weather_multiplier
        
        # Elevation impact (simplified: 0.5 kWh per 100m elevation gain)
        if elevation_gain > 0:
            consumption += (elevation_gain / 100.0) * 0.5
        
        return consumption
    
    def find_charging_stops(self, route_segments: List[RouteSegment], 
                          current_battery_kwh: float, battery_capacity: float,
                          min_threshold_percent: float, target_percent: float,
                          connector_type: str) -> List[ChargingStop]:
        """Find optimal charging stops along the route"""
        
        charging_stops = []
        current_battery = current_battery_kwh
        distance_traveled = 0.0
        
        min_threshold_kwh = (min_threshold_percent / 100.0) * battery_capacity
        target_kwh = (target_percent / 100.0) * battery_capacity
        
        for segment in route_segments:
            # Deduct energy consumption for this segment
            current_battery -= segment.energy_consumption
            distance_traveled += segment.distance
            
            # Check if we need to charge
            if current_battery < min_threshold_kwh:
                # Create a charging stop (simplified - in production, query actual charger database)
                charging_needed = target_kwh - current_battery
                charging_power = 50.0  # Assume 50kW DC fast charging
                charging_time = (charging_needed / charging_power) * 60  # Convert to minutes
                
                stop = ChargingStop(
                    charger_id=f"charger-{len(charging_stops) + 1}",
                    name=f"Charging Station {len(charging_stops) + 1}",
                    location=segment.end_location,
                    distance_from_origin=distance_traveled,
                    arrival_battery=(current_battery / battery_capacity) * 100,
                    departure_battery=target_percent,
                    charging_time=charging_time,
                    charging_power=charging_power,
                    cost_estimate=charging_needed * 35  # Assume LKR 35 per kWh
                )
                
                charging_stops.append(stop)
                segment.has_charging_stop = True
                segment.charging_stop = stop
                
                # Update battery to target level
                current_battery = target_kwh
        
        return charging_stops
    
    def generate_safety_alerts(self, estimated_arrival_battery: float, 
                              charging_stops: List[ChargingStop],
                              weather_conditions: Optional[Dict] = None) -> List[SafetyAlert]:
        """Generate safety alerts for the trip"""
        alerts = []
        
        # Low battery alert at destination
        if estimated_arrival_battery < 15:
            alerts.append(SafetyAlert(
                type="low_battery",
                severity="high",
                message=f"Warning: Estimated arrival battery is low ({estimated_arrival_battery:.1f}%). Consider adding a charging stop."
            ))
        elif estimated_arrival_battery < 25:
            alerts.append(SafetyAlert(
                type="low_battery",
                severity="medium",
                message=f"Caution: Arrival battery will be {estimated_arrival_battery:.1f}%. Plan charging if needed."
            ))
        
        # Weather alerts
        if weather_conditions:
            weather_main = weather_conditions.get('weather', [{}])[0].get('main', '').lower()
            if weather_main in ['rain', 'snow', 'thunderstorm']:
                alerts.append(SafetyAlert(
                    type="weather",
                    severity="medium",
                    message=f"Weather alert: {weather_main.capitalize()} expected. Drive safely and expect increased energy consumption."
                ))
        
        # Multiple charging stops alert
        if len(charging_stops) > 2:
            alerts.append(SafetyAlert(
                type="charging_stops",
                severity="low",
                message=f"This trip requires {len(charging_stops)} charging stops. Consider planning extra time."
            ))
        
        return alerts
    
    async def create_trip_plan(self, request: TripPlanRequest) -> TripPlan:
        """Create a complete trip plan with route optimization and charging stops"""
        
        # Calculate current battery in kWh
        current_battery_kwh = (request.current_battery_level / 100.0) * request.battery_capacity
        
        # Get route from Google Maps (or calculate simple route)
        google_route = self.get_route_from_google(request.origin, request.destination, request.waypoints)
        
        # If Google Maps fails, use simple calculation
        if google_route:
            total_distance = google_route['legs'][0]['distance']['value'] / 1000.0  # Convert to km
            total_duration = google_route['legs'][0]['duration']['value'] / 60.0  # Convert to minutes
            polyline = google_route['overview_polyline']['points']
        else:
            # Fallback to simple calculation
            total_distance = self.calculate_distance(request.origin, request.destination)
            total_duration = total_distance / 60.0 * 60  # Assume 60 km/h average
            polyline = None
        
        # Get weather data for destination
        weather_data = self.get_weather_forecast(request.destination)
        
        # Create route segments (simplified: split into ~50km segments)
        segment_distance = 50.0
        num_segments = max(1, int(total_distance / segment_distance))
        actual_segment_distance = total_distance / num_segments
        
        route_segments = []
        current_location = request.origin
        
        for i in range(num_segments):
            # Calculate segment endpoint (simplified linear interpolation)
            progress = (i + 1) / num_segments
            segment_end = {
                'lat': request.origin['lat'] + (request.destination['lat'] - request.origin['lat']) * progress,
                'lng': request.origin['lng'] + (request.destination['lng'] - request.origin['lng']) * progress
            }
            
            # Get weather condition (simplified)
            weather_condition = None
            if weather_data and weather_data.get('weather'):
                weather_condition = weather_data['weather'][0]['main']
            
            # Calculate energy consumption for segment
            energy = self.calculate_energy_consumption(
                actual_segment_distance,
                request.average_consumption,
                request.driving_mode,
                weather_condition
            )
            
            segment = RouteSegment(
                segment_index=i,
                start_location=current_location,
                end_location=segment_end,
                distance=actual_segment_distance,
                duration=total_duration / num_segments,
                energy_consumption=energy,
                weather_condition=weather_condition
            )
            
            route_segments.append(segment)
            current_location = segment_end
        
        # Calculate total energy required
        total_energy = sum(seg.energy_consumption for seg in route_segments)
        
        # Find optimal charging stops
        charging_stops = self.find_charging_stops(
            route_segments,
            current_battery_kwh,
            request.battery_capacity,
            request.min_battery_threshold,
            request.target_battery_at_stop,
            request.connector_type
        )
        
        # Calculate estimated arrival battery
        final_battery_kwh = current_battery_kwh + sum(
            (stop.departure_battery - stop.arrival_battery) / 100.0 * request.battery_capacity 
            for stop in charging_stops
        ) - total_energy
        
        estimated_arrival_battery = (final_battery_kwh / request.battery_capacity) * 100
        
        # Generate safety alerts
        safety_alerts = self.generate_safety_alerts(
            estimated_arrival_battery,
            charging_stops,
            weather_data
        )
        
        # Create trip plan
        trip_plan = TripPlan(
            trip_id=f"trip-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            total_distance=total_distance,
            total_duration=total_duration + sum(stop.charging_time for stop in charging_stops),
            total_energy_required=total_energy,
            charging_stops=charging_stops,
            route_segments=route_segments,
            safety_alerts=safety_alerts,
            estimated_arrival_battery=max(0, estimated_arrival_battery),
            route_polyline=polyline,
            created_at=datetime.now().isoformat()
        )
        
        return trip_plan


# Global instance
trip_planner = TripPlanner()
