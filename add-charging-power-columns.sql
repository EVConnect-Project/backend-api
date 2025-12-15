-- Add maxAcChargingPower and maxDcChargingPower columns to vehicle_profiles table
-- Make rangeKm nullable

ALTER TABLE vehicle_profiles 
ADD COLUMN IF NOT EXISTS "maxAcChargingPower" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "maxDcChargingPower" VARCHAR(50);

ALTER TABLE vehicle_profiles 
ALTER COLUMN "rangeKm" DROP NOT NULL;

-- Update existing vehicles with default values if needed
UPDATE vehicle_profiles 
SET "rangeKm" = "batteryCapacity" * 5 
WHERE "rangeKm" IS NULL;
