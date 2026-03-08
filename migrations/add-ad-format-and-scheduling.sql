-- Phase 3 Migration: Ad format, time-of-day + day-of-week scheduling
-- Run after: add-ad-impressions-and-frequency-cap.sql

-- 1. Create ad_format enum
DO $$ BEGIN
  CREATE TYPE ad_format_enum AS ENUM ('banner', 'native', 'sponsored');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add ad format column
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS "adFormat" ad_format_enum NOT NULL DEFAULT 'banner';

-- 3. Add scheduling columns
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS "scheduleDays" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduleHoursStart" INTEGER,
  ADD COLUMN IF NOT EXISTS "scheduleHoursEnd" INTEGER;

COMMENT ON COLUMN promotions."scheduleDays"
  IS 'Comma-separated days: mon,tue,wed,thu,fri,sat,sun. NULL = all days';

COMMENT ON COLUMN promotions."scheduleHoursStart"
  IS 'Start hour (0-23). NULL = no time restriction';

COMMENT ON COLUMN promotions."scheduleHoursEnd"
  IS 'End hour (0-23). NULL = no time restriction';

-- 4. Index for format+placement queries
CREATE INDEX IF NOT EXISTS idx_promotions_format_placement
  ON promotions ("adFormat", placement, status);
