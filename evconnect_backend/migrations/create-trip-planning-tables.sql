-- Migration: Create Trip Planning Tables
-- Date: 2025-12-03
-- Description: Creates tables for storing trip plans, segments, and charging session history

-- Main trips table
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicle_profiles(id) ON DELETE SET NULL,
    
    -- Trip details
    name VARCHAR(255),
    start_location JSON NOT NULL, -- {lat, lng, address}
    end_location JSON NOT NULL,   -- {lat, lng, address}
    stops JSON,                    -- Array of intermediate stops
    
    -- Metrics
    total_distance DECIMAL(10,2),  -- km
    estimated_time INTEGER,         -- minutes
    total_cost DECIMAL(10,2),      -- currency
    energy_consumption DECIMAL(10,2), -- kWh
    
    -- Battery info
    starting_battery INTEGER,       -- %
    ending_battery INTEGER,         -- %
    recommended_departure_battery INTEGER, -- %
    
    -- Status
    status VARCHAR(20) DEFAULT 'planned', -- planned, active, completed, cancelled
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Trip segments table (for detailed route breakdown)
CREATE TABLE IF NOT EXISTS trip_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Segment details
    segment_order INTEGER NOT NULL,
    start_point JSON NOT NULL,      -- {lat, lng, address}
    end_point JSON NOT NULL,        -- {lat, lng, address}
    
    -- Metrics
    distance DECIMAL(10,2),         -- km
    battery_used INTEGER,           -- %
    energy_consumed DECIMAL(10,2),  -- kWh
    duration INTEGER,               -- minutes
    
    -- Conditions
    terrain_type VARCHAR(50),       -- flat, hilly, mountainous
    weather_condition JSON,         -- {temp, wind, rain, etc}
    traffic_level VARCHAR(20),      -- low, moderate, high
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Charging sessions history table
CREATE TABLE IF NOT EXISTS charging_sessions_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    charger_id UUID REFERENCES chargers(id) ON DELETE SET NULL,
    
    -- Session details
    arrival_battery INTEGER,        -- %
    depart_battery INTEGER,         -- %
    energy_added DECIMAL(10,2),     -- kWh
    charging_time INTEGER,          -- minutes
    cost DECIMAL(10,2),            -- currency
    
    -- Charger info snapshot (in case charger is deleted)
    charger_snapshot JSON,          -- {name, address, powerKw, pricePerKwh}
    
    -- Status
    status VARCHAR(20) DEFAULT 'planned', -- planned, charging, completed, skipped
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    arrival_time TIMESTAMP,
    depart_time TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_segments_trip_id ON trip_segments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_segments_order ON trip_segments(trip_id, segment_order);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_trip_id ON charging_sessions_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_user_id ON charging_sessions_history(user_id);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_charger_id ON charging_sessions_history(charger_id);

-- Add comments
COMMENT ON TABLE trips IS 'Stores user trip plans and their execution details';
COMMENT ON TABLE trip_segments IS 'Breaks down trips into segments for detailed tracking';
COMMENT ON TABLE charging_sessions_history IS 'Records all charging sessions during trips';
