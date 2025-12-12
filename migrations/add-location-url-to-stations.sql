-- Add location_url column to charging_stations table
ALTER TABLE charging_stations 
ADD COLUMN IF NOT EXISTS location_url TEXT;

-- Add comment
COMMENT ON COLUMN charging_stations.location_url IS 'Google Maps URL for the station location';
