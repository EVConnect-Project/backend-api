-- Migration: Add trip planning fields to chargers table
-- Date: 2025-12-14
-- Purpose: Add Google Maps URL and reliability score for smart trip planning

-- Add Google Maps URL field
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS google_map_url TEXT;

-- Add reliability score field (0.00 to 1.00, default 0.95 = 95% reliability)
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(4,2) DEFAULT 0.95 CHECK (reliability_score >= 0 AND reliability_score <= 1);

-- Add comment for documentation
COMMENT ON COLUMN chargers.google_map_url IS 'Google Maps URL for the charger location (e.g., https://maps.google.com/...)';
COMMENT ON COLUMN chargers.reliability_score IS 'Charger reliability score from 0.00 to 1.00, used for trip planning route ranking';

-- Create index for trip planning queries
CREATE INDEX IF NOT EXISTS idx_chargers_reliability_score ON chargers(reliability_score DESC);
CREATE INDEX IF NOT EXISTS idx_chargers_status_connector ON chargers(status, "connectorType") WHERE status = 'available';
