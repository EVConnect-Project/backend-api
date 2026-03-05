-- Migration: Add vehicle compatibility fields for vehicle-aware charger filtering
-- Date: 2026-03-05
-- Description: 
--   1. Add maxAcChargingPower and maxDcChargingPower columns (were in DTO but never persisted)
--   2. Add connectorTypes JSONB array column for multi-connector support
--   3. Migrate existing single connectorType string data into the new array column

-- Step 1: Add charging power columns
ALTER TABLE vehicle_profiles 
  ADD COLUMN IF NOT EXISTS "maxAcChargingPower" decimal(8,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "maxDcChargingPower" decimal(8,2) DEFAULT NULL;

-- Step 2: Add connectorTypes array column (JSONB array of normalized connector strings)
-- Values: type2, ccs2, chademo, type1, ccs1, gb_t_ac, gb_t_dc, tesla, three_phase_type2
ALTER TABLE vehicle_profiles
  ADD COLUMN IF NOT EXISTS "connectorTypes" jsonb DEFAULT '[]'::jsonb;

-- Step 3: Migrate existing connectorType string into connectorTypes array
-- Normalize common formats into standard values
UPDATE vehicle_profiles
SET "connectorTypes" = CASE
  -- Already empty or null
  WHEN "connectorType" IS NULL OR "connectorType" = '' THEN '[]'::jsonb
  -- Comma-separated values (e.g., "CCS2, Type 2")
  ELSE (
    SELECT jsonb_agg(DISTINCT normalized)
    FROM (
      SELECT 
        CASE LOWER(TRIM(val))
          WHEN 'ccs2' THEN 'ccs2'
          WHEN 'ccs type 2' THEN 'ccs2'
          WHEN 'ccs2 (dc)' THEN 'ccs2'
          WHEN 'ccs' THEN 'ccs2'
          WHEN 'type2' THEN 'type2'
          WHEN 'type 2' THEN 'type2'
          WHEN 'type 2 (ac)' THEN 'type2'
          WHEN 'type 2 (mennekes)' THEN 'type2'
          WHEN 'mennekes' THEN 'type2'
          WHEN 'type1' THEN 'type1'
          WHEN 'type 1' THEN 'type1'
          WHEN 'type 1 (j1772)' THEN 'type1'
          WHEN 'type1_j1772' THEN 'type1'
          WHEN 'j1772' THEN 'type1'
          WHEN 'ccs1' THEN 'ccs1'
          WHEN 'ccs type 1' THEN 'ccs1'
          WHEN 'chademo' THEN 'chademo'
          WHEN 'tesla' THEN 'tesla'
          WHEN 'tesla_nacs' THEN 'tesla'
          WHEN 'tesla supercharger' THEN 'tesla'
          WHEN 'nacs' THEN 'tesla'
          WHEN 'gb/t' THEN 'gb_t_ac'
          WHEN 'gb_t_ac' THEN 'gb_t_ac'
          WHEN 'gb/t ac' THEN 'gb_t_ac'
          WHEN 'gb_t_dc' THEN 'gb_t_dc'
          WHEN 'gb/t dc' THEN 'gb_t_dc'
          WHEN 'three_phase_type2' THEN 'three_phase_type2'
          WHEN 'type 2 (3-phase)' THEN 'three_phase_type2'
          ELSE LOWER(TRIM(val))
        END AS normalized
      FROM unnest(string_to_array("connectorType", ',')) AS val
    ) sub
    WHERE normalized IS NOT NULL AND normalized != ''
  )
END
WHERE "connectorTypes" = '[]'::jsonb OR "connectorTypes" IS NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN vehicle_profiles."connectorTypes" IS 'JSON array of normalized connector type strings. Values: type2, ccs2, chademo, type1, ccs1, gb_t_ac, gb_t_dc, tesla, three_phase_type2';
COMMENT ON COLUMN vehicle_profiles."maxAcChargingPower" IS 'Maximum AC charging power in kW (e.g., 7.4, 11, 22)';
COMMENT ON COLUMN vehicle_profiles."maxDcChargingPower" IS 'Maximum DC charging power in kW (e.g., 50, 150, 250)';
