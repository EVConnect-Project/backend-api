-- Migration: Add charging stations and charger sockets tables
-- Date: 2025-12-10

-- Create charging_stations table
CREATE TABLE IF NOT EXISTS charging_stations (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "stationName" VARCHAR(255) NOT NULL,
    "locationUrl" TEXT NOT NULL,
    "lat" DECIMAL(10, 7),
    "lng" DECIMAL(10, 7),
    "address" TEXT,
    "parkingCapacity" INTEGER,
    "description" TEXT,
    "amenities" JSONB DEFAULT '[]'::jsonb,
    "openingHours" JSONB DEFAULT '{"is24Hours": true, "schedule": {}}'::jsonb,
    "images" JSONB DEFAULT '[]'::jsonb,
    "accessType" VARCHAR(20) DEFAULT 'public',
    "verified" BOOLEAN DEFAULT false,
    "isBanned" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create charger_sockets table
CREATE TABLE IF NOT EXISTS charger_sockets (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "chargerId" UUID NOT NULL REFERENCES "chargers"("id") ON DELETE CASCADE,
    "socketNumber" INTEGER NOT NULL,
    "socketLabel" VARCHAR(50),
    "connectorType" VARCHAR(50) NOT NULL,
    "maxPowerKw" DECIMAL(6, 2) NOT NULL,
    "pricePerKwh" DECIMAL(8, 4),
    "pricePerHour" DECIMAL(8, 4),
    "isFree" BOOLEAN DEFAULT false,
    "bookingMode" VARCHAR(20) DEFAULT 'both',
    "status" VARCHAR(20) DEFAULT 'available',
    "occupiedBy" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("chargerId", "socketNumber")
);

-- Add stationId and chargerIdentifier columns to chargers table
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "stationId" UUID REFERENCES charging_stations("id") ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS "chargerIdentifier" VARCHAR(100);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_charging_stations_owner ON charging_stations("ownerId");
CREATE INDEX IF NOT EXISTS idx_charging_stations_location ON charging_stations("lat", "lng");
CREATE INDEX IF NOT EXISTS idx_charging_stations_verified ON charging_stations("verified");

CREATE INDEX IF NOT EXISTS idx_charger_sockets_charger ON charger_sockets("chargerId");
CREATE INDEX IF NOT EXISTS idx_charger_sockets_status ON charger_sockets("status");

CREATE INDEX IF NOT EXISTS idx_chargers_station ON chargers("stationId");

-- Create update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_charging_stations_updated_at ON charging_stations;
CREATE TRIGGER update_charging_stations_updated_at
    BEFORE UPDATE ON charging_stations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_charger_sockets_updated_at ON charger_sockets;
CREATE TRIGGER update_charger_sockets_updated_at
    BEFORE UPDATE ON charger_sockets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
