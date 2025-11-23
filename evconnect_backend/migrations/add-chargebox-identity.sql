-- Add chargeBoxIdentity to chargers table to link with OCPP system
-- This allows registered chargers to be controlled via OCPP protocol

ALTER TABLE chargers 
ADD COLUMN "chargeBoxIdentity" VARCHAR(100) UNIQUE,
ADD COLUMN "ocppStatus" VARCHAR(50) DEFAULT 'not_configured',
ADD COLUMN "isOnline" BOOLEAN DEFAULT false,
ADD COLUMN "lastHeartbeat" TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX idx_chargers_chargebox_identity ON chargers("chargeBoxIdentity");

-- Add comments for documentation
COMMENT ON COLUMN chargers."chargeBoxIdentity" IS 'Unique identifier for OCPP WebSocket connection';
COMMENT ON COLUMN chargers."ocppStatus" IS 'OCPP configuration status: not_configured, pending, configured, connected';
COMMENT ON COLUMN chargers."isOnline" IS 'Real-time OCPP connection status synced from charging service';
COMMENT ON COLUMN chargers."lastHeartbeat" IS 'Last OCPP heartbeat timestamp synced from charging service';
