-- Update existing chargers with default charger types
-- Run this script to populate speedType and connectorType for existing chargers

-- Update all chargers without speedType based on their power rating
UPDATE chargers
SET "speedType" = CASE
  WHEN "powerKw" < 7 THEN 'ac_slow'
  WHEN "powerKw" >= 7 AND "powerKw" < 22 THEN 'ac_fast'
  WHEN "powerKw" >= 22 AND "powerKw" < 50 THEN 'dc_fast'
  WHEN "powerKw" >= 50 AND "powerKw" < 150 THEN 'dc_rapid'
  WHEN "powerKw" >= 150 THEN 'ultra_rapid'
  ELSE 'dc_fast'
END
WHERE "speedType" IS NULL;

-- Update all chargers without connectorType with default Type 2
UPDATE chargers
SET "connectorType" = 'type2'
WHERE "connectorType" IS NULL;

-- Verify the update
SELECT id, name, "powerKw", "speedType", "connectorType"
FROM chargers
ORDER BY "createdAt" DESC
LIMIT 10;

-- Count chargers by type
SELECT "speedType", COUNT(*) as count
FROM chargers
GROUP BY "speedType";

SELECT "connectorType", COUNT(*) as count
FROM chargers
GROUP BY "connectorType";
