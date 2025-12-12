-- Make station_id nullable for individual chargers
ALTER TABLE chargers 
ALTER COLUMN station_id DROP NOT NULL;

-- Add comment to explain
COMMENT ON COLUMN chargers.station_id IS 'Optional: Only set for chargers that belong to a charging station';
