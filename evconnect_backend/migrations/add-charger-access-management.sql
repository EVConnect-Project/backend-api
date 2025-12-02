-- Migration: Enhanced Charger Management for Public/Manual Chargers
-- Created: 2025-12-02
-- Description: Adds fields to handle public chargers, real-time occupancy, and booking conflicts

-- Add charger access type (private/public/semi-public)
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "accessType" VARCHAR(20) DEFAULT 'private';

-- Add requires authentication flag
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "requiresAuth" BOOLEAN DEFAULT true;

-- Add physical verification requirement
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "requiresPhysicalCheck" BOOLEAN DEFAULT false;

-- Add grace period for booking (minutes)
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "bookingGracePeriod" INTEGER DEFAULT 15;

-- Add auto-cancel if not started (minutes)
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "autoCancelAfter" INTEGER DEFAULT 30;

-- Add last physical check timestamp
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "lastPhysicalCheck" TIMESTAMP;

-- Add occupancy sensor integration
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "hasOccupancySensor" BOOLEAN DEFAULT false;

-- Add manual override flag (for emergency situations)
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "manualOverride" BOOLEAN DEFAULT false;

-- Add warning messages for public chargers
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "publicAccessWarning" TEXT;

-- Create index for access type queries
CREATE INDEX IF NOT EXISTS idx_chargers_access_type ON chargers("accessType");
CREATE INDEX IF NOT EXISTS idx_chargers_requires_auth ON chargers("requiresAuth");

-- Add comments
COMMENT ON COLUMN chargers."accessType" IS 'private: App-controlled only, public: Anyone can use, semi-public: Requires app but no booking enforcement';
COMMENT ON COLUMN chargers."requiresAuth" IS 'Whether charger requires authentication to start (OCPP-enabled chargers)';
COMMENT ON COLUMN chargers."requiresPhysicalCheck" IS 'Whether system should prompt users to verify physical availability before booking';
COMMENT ON COLUMN chargers."bookingGracePeriod" IS 'Minutes before booking starts where user can cancel without penalty';
COMMENT ON COLUMN chargers."autoCancelAfter" IS 'Minutes after booking time where system auto-cancels if session not started';
COMMENT ON COLUMN chargers."hasOccupancySensor" IS 'Whether charger has IoT occupancy sensor for real-time availability';
