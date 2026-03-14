-- Migration: Add vehicleType column to vehicle_profiles table
-- Date: 2026-01-11
-- Description: Adds vehicleType column to store the type of vehicle (car, suv, van, bus, etc.)

-- Add the vehicleType column
ALTER TABLE vehicle_profiles 
ADD COLUMN IF NOT EXISTS "vehicleType" VARCHAR(50) DEFAULT 'car';

-- Add comment for documentation
COMMENT ON COLUMN vehicle_profiles."vehicleType" IS 'Type of vehicle: car, suv, van, bus, motorbike, scooty, threewheel, truck';

-- Update existing records to have 'car' as default vehicleType where NULL
UPDATE vehicle_profiles 
SET "vehicleType" = 'car' 
WHERE "vehicleType" IS NULL;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_vehicle_type ON vehicle_profiles("vehicleType");