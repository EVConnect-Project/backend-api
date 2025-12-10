-- Add phone and countryCode columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "countryCode" VARCHAR(10);

-- Add index for phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
