-- Migration: Update booking_mode enum values
-- Changes:
--   - 'pre_booking_required' -> 'pre_booking'
--   - 'walk_in_only' -> 'walk_in'
--   - 'hybrid' remains the same
-- Default value changed from 'walk_in_only' to 'hybrid'

-- Step 0: Drop any existing check constraints on booking_mode
ALTER TABLE chargers DROP CONSTRAINT IF EXISTS chk_booking_mode;

-- Step 1: Create temporary enum with new values
CREATE TYPE booking_mode_new AS ENUM ('pre_booking', 'walk_in', 'hybrid');

-- Step 2: Update existing chargers table column to use new enum
-- First, drop the default temporarily
ALTER TABLE chargers ALTER COLUMN booking_mode DROP DEFAULT;

-- Then convert existing values to new values
UPDATE chargers 
SET booking_mode = CASE 
    WHEN booking_mode::text = 'pre_booking_required' THEN 'pre_booking'
    WHEN booking_mode::text = 'walk_in_only' THEN 'walk_in'
    WHEN booking_mode::text = 'walk_in' THEN 'walk_in'
    WHEN booking_mode::text = 'hybrid' THEN 'hybrid'
    ELSE 'hybrid'  -- Default to hybrid for any unknown values
END::text;

-- Step 3: Alter column to use new enum type
ALTER TABLE chargers 
ALTER COLUMN booking_mode TYPE booking_mode_new 
USING booking_mode::text::booking_mode_new;

-- Step 4: Drop old enum type
DROP TYPE IF EXISTS booking_mode CASCADE;

-- Step 5: Rename new enum to original name
ALTER TYPE booking_mode_new RENAME TO booking_mode;

-- Step 6: Update default value to 'hybrid'
ALTER TABLE chargers 
ALTER COLUMN booking_mode SET DEFAULT 'hybrid'::booking_mode;

-- Verification queries (optional - comment out in production)
-- SELECT DISTINCT booking_mode FROM chargers;
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'chargers' AND column_name = 'booking_mode';
