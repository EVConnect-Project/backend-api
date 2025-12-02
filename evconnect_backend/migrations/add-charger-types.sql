-- Migration: Add charger type fields
-- Created: 2025-12-02
-- Description: Adds speed-based and connector-based type fields to chargers table

-- Add speedType column (Speed-Based classification)
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "speedType" VARCHAR(50);

-- Add connectorType column (Connector-Based classification)
ALTER TABLE chargers 
ADD COLUMN IF NOT EXISTS "connectorType" VARCHAR(50);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chargers_speed_type ON chargers("speedType");
CREATE INDEX IF NOT EXISTS idx_chargers_connector_type ON chargers("connectorType");

-- Add comments for documentation
COMMENT ON COLUMN chargers."speedType" IS 'Speed-based charger classification: ac_slow, ac_fast, dc_fast, dc_rapid, ultra_rapid, tesla_supercharger';
COMMENT ON COLUMN chargers."connectorType" IS 'Connector-based charger type: type2, type1_j1772, ccs2, chademo, tesla_nacs';
