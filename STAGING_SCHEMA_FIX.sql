-- ============================================================================
-- Staging schema reconciliation patch — 2026-05-18
--
-- Adds columns that the current backend entities expect but the staging
-- Postgres database is missing. All statements are additive and idempotent
-- (use IF NOT EXISTS), so this script is safe to run multiple times and will
-- never drop data.
--
-- Run this once on the evrs-db-staging Postgres via Render PSQL Shell.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- USERS: entity declares snake_case columns; staging has only some camelCase
-- duplicates. Add the missing snake_case columns and backfill from camelCase
-- counterparts where they exist.
-- ----------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code            varchar(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified             boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned               boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender                  varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type            varchar(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_brand           varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_model           varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS battery_capacity        numeric(5,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS connector_type          jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms          boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_privacy_policy boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at       timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at              timestamp DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at              timestamp DEFAULT now();

-- Backfill snake_case from camelCase duplicates where the camelCase column exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='countryCode') THEN
    EXECUTE 'UPDATE users SET country_code = "countryCode" WHERE country_code IS NULL AND "countryCode" IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='isVerified') THEN
    EXECUTE 'UPDATE users SET is_verified = COALESCE("isVerified", is_verified, false)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='isBanned') THEN
    EXECUTE 'UPDATE users SET is_banned = COALESCE("isBanned", is_banned, false)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='createdAt') THEN
    EXECUTE 'UPDATE users SET created_at = "createdAt" WHERE created_at IS NULL AND "createdAt" IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updatedAt') THEN
    EXECUTE 'UPDATE users SET updated_at = "updatedAt" WHERE updated_at IS NULL AND "updatedAt" IS NOT NULL';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- BOOKINGS: entity wants camelCase "socketId"; staging only has snake_case
-- "socket_id". Add the camelCase column and copy values across.
-- ----------------------------------------------------------------------------
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "socketId" uuid;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='socket_id') THEN
    EXECUTE 'UPDATE bookings SET "socketId" = socket_id WHERE "socketId" IS NULL AND socket_id IS NOT NULL';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TRIP_PLANS: entity wants camelCase "vehicleProfileId"; staging missing it.
-- ----------------------------------------------------------------------------
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS "vehicleProfileId" uuid;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_plans' AND column_name='vehicle_profile_id') THEN
    EXECUTE 'UPDATE trip_plans SET "vehicleProfileId" = vehicle_profile_id WHERE "vehicleProfileId" IS NULL AND vehicle_profile_id IS NOT NULL';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION: run these afterwards to confirm the patch landed cleanly.
-- ============================================================================
-- \d users
-- \d bookings
-- \d trip_plans
-- SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY column_name;
