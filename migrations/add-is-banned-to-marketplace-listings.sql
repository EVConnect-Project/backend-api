-- Add isBanned column to marketplace_listings table
ALTER TABLE marketplace_listings 
ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_is_banned ON marketplace_listings("isBanned");
