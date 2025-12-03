-- Migration: Add Trip Planning Fields to Vehicle Profiles
-- Date: 2025-12-03
-- Description: Adds energy efficiency and trip planning related fields

ALTER TABLE vehicle_profiles
ADD COLUMN IF NOT EXISTS average_consumption DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS efficiency DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS charging_curve JSON,
ADD COLUMN IF NOT EXISTS driving_mode VARCHAR(20) DEFAULT 'normal';

-- Add comments for documentation
COMMENT ON COLUMN vehicle_profiles.average_consumption IS 'Average energy consumption in Wh/km';
COMMENT ON COLUMN vehicle_profiles.efficiency IS 'Vehicle efficiency in km/kWh';
COMMENT ON COLUMN vehicle_profiles.charging_curve IS 'JSON array of charging power at different battery percentages';
COMMENT ON COLUMN vehicle_profiles.driving_mode IS 'Driving mode preference: eco, normal, or sport';

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_driving_mode ON vehicle_profiles(driving_mode);
