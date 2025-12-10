-- Run this to add vehicle_profiles table to existing database
-- This combines init-db.sql entry with the migration file

-- Create vehicle_profiles table
CREATE TABLE IF NOT EXISTS vehicle_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
    "batteryCapacity" DECIMAL(10, 2) NOT NULL CHECK ("batteryCapacity" > 0),
    "connectorType" VARCHAR(50) NOT NULL,
    "rangeKm" DECIMAL(10, 2) NOT NULL CHECK ("rangeKm" > 0),
    "isPrimary" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on userId for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_user_id ON vehicle_profiles("userId");

-- Create index on isPrimary for faster primary vehicle lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_is_primary ON vehicle_profiles("isPrimary");

-- Function to update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_vehicle_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updatedAt
CREATE TRIGGER trigger_update_vehicle_profiles_updated_at
    BEFORE UPDATE ON vehicle_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_profiles_updated_at();
