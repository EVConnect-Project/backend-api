-- Migration: Update Trip Plans Schema
-- Date: 2026-03-06
-- Description: Updates trip_plans table to match new TripPlanEntity with smart route planning fields

-- Drop old tables that will be replaced
DROP TABLE IF EXISTS trip_segments CASCADE;
DROP TABLE IF EXISTS trip_plans CASCADE;

-- Recreate trip_plans with new schema matching TripPlanEntity
CREATE TABLE IF NOT EXISTS trip_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "vehicleId" UUID REFERENCES vehicle_profiles(id) ON DELETE SET NULL,

    -- Start location
    "startLat" DECIMAL(10, 7) NOT NULL,
    "startLng" DECIMAL(10, 7) NOT NULL,
    "startAddress" VARCHAR(255),

    -- Destination
    "destLat" DECIMAL(10, 7) NOT NULL,
    "destLng" DECIMAL(10, 7) NOT NULL,
    "destAddress" VARCHAR(255),

    -- Waypoints (JSON array of {lat, lng, address?})
    waypoints JSONB DEFAULT '[]',

    -- Route summary
    "totalDistanceKm" DECIMAL(8, 1) NOT NULL,
    "totalDurationMinutes" INT NOT NULL,
    "drivingDurationMinutes" INT NOT NULL,
    "totalChargingTimeMinutes" INT DEFAULT 0,
    "totalChargingCostLkr" INT DEFAULT 0,
    "routeScore" INT NOT NULL,
    "routePolyline" TEXT,
    "routeSummary" VARCHAR(255),

    -- Driving settings
    "drivingMode" VARCHAR(20) DEFAULT 'normal',
    "startBatteryPercent" INT DEFAULT 80,
    "arrivalBatteryPercent" INT DEFAULT 0,

    -- Charging stops (JSON array)
    "chargingStops" JSONB DEFAULT '[]',

    -- Safety warnings (JSON array)
    "safetyWarnings" JSONB DEFAULT '[]',

    -- Status lifecycle
    status VARCHAR(20) DEFAULT 'planned',

    -- Timestamps
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_plans_user_id ON trip_plans("userId");
CREATE INDEX IF NOT EXISTS idx_trip_plans_status ON trip_plans(status);
CREATE INDEX IF NOT EXISTS idx_trip_plans_vehicle_id ON trip_plans("vehicleId");
CREATE INDEX IF NOT EXISTS idx_trip_plans_created_at ON trip_plans("createdAt" DESC);

-- Grant permissions
GRANT ALL PRIVILEGES ON trip_plans TO evrs_user;
