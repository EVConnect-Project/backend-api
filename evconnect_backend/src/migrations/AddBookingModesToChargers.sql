-- Migration: Add Booking Modes to Chargers and Bookings
-- Date: 2025-12-05
-- Description: Add booking_mode, booking_settings, status tracking to chargers
--              Add booking_type, check-in tracking to bookings

-- Add columns to chargers table
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS booking_mode VARCHAR(30) DEFAULT 'walk_in_only',
ADD COLUMN IF NOT EXISTS booking_settings JSONB DEFAULT '{
  "minBookingMinutes": 30,
  "maxBookingMinutes": 180,
  "advanceBookingDays": 7,
  "gracePeriodMinutes": 10,
  "allowSameDayBooking": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) DEFAULT 'available',
ADD COLUMN IF NOT EXISTS last_status_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'pre_booking',
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grace_period_expires_at TIMESTAMP NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chargers_booking_mode ON chargers(booking_mode);
CREATE INDEX IF NOT EXISTS idx_chargers_current_status ON chargers(current_status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_no_show ON bookings(no_show) WHERE no_show = TRUE;
CREATE INDEX IF NOT EXISTS idx_bookings_grace_period ON bookings(grace_period_expires_at) WHERE grace_period_expires_at IS NOT NULL;

-- Add check constraints for valid enum values
ALTER TABLE chargers DROP CONSTRAINT IF EXISTS chk_booking_mode;
ALTER TABLE chargers ADD CONSTRAINT chk_booking_mode 
  CHECK (booking_mode IN ('pre_booking_required', 'walk_in_only', 'hybrid'));

ALTER TABLE chargers DROP CONSTRAINT IF EXISTS chk_current_status;
ALTER TABLE chargers ADD CONSTRAINT chk_current_status 
  CHECK (current_status IN ('available', 'occupied', 'reserved', 'maintenance', 'offline'));

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_booking_type;
ALTER TABLE bookings ADD CONSTRAINT chk_booking_type 
  CHECK (booking_type IN ('pre_booking', 'walk_in'));

-- Update existing chargers to have default booking mode
UPDATE chargers 
SET booking_mode = 'walk_in_only', 
    current_status = 'available',
    last_status_update = CURRENT_TIMESTAMP
WHERE booking_mode IS NULL;

-- Update existing bookings to have default booking type
UPDATE bookings 
SET booking_type = 'pre_booking'
WHERE booking_type IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN chargers.booking_mode IS 'Booking mode: pre_booking_required, walk_in_only, or hybrid';
COMMENT ON COLUMN chargers.booking_settings IS 'JSON settings for booking configuration (durations, advance days, grace period)';
COMMENT ON COLUMN chargers.current_status IS 'Real-time charger status: available, occupied, reserved, maintenance, offline';
COMMENT ON COLUMN chargers.last_status_update IS 'Timestamp of last status change';
COMMENT ON COLUMN bookings.booking_type IS 'Type of booking: pre_booking or walk_in';
COMMENT ON COLUMN bookings.check_in_time IS 'Timestamp when user checked in for their booking';
COMMENT ON COLUMN bookings.no_show IS 'Whether user failed to show up for their booking';
COMMENT ON COLUMN bookings.grace_period_expires_at IS 'Timestamp when grace period ends for pre-bookings';
