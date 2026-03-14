-- Add phone number and amenities fields to chargers table
-- Run: psql -U your_user -d evrs_db -f add-phone-amenities-to-chargers.sql

-- Add phone number column
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add amenities column
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT NULL;

-- Add some sample data for existing chargers
UPDATE chargers 
SET phone_number = '+94112345678',
    amenities = '{"coffee": true, "restaurant": true, "parking": true, "restroom": true, "wifi": true, "service": false}'::jsonb
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

UPDATE chargers 
SET phone_number = '+94112345679',
    amenities = '{"coffee": false, "restaurant": true, "parking": true, "restroom": true, "wifi": true, "service": true}'::jsonb
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

UPDATE chargers 
SET phone_number = '+94812345678',
    amenities = '{"coffee": true, "restaurant": false, "parking": true, "restroom": true, "wifi": false, "service": false}'::jsonb
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- Add comment to columns
COMMENT ON COLUMN chargers.phone_number IS 'Contact phone number for the charging station';
COMMENT ON COLUMN chargers.amenities IS 'Available amenities at the charging station (coffee, restaurant, parking, restroom, wifi, service)';
