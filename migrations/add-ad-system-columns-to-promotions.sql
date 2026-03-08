-- Migration: Add ad system columns to promotions table
-- Phase 1: Image support, placement types, priority, CTA, advertiser fields

-- Add placement enum type
DO $$ BEGIN
  CREATE TYPE ad_placement_enum AS ENUM ('home_banner', 'home_native', 'search_sponsored');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS placement ad_placement_enum NOT NULL DEFAULT 'home_banner',
  ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR,
  ADD COLUMN IF NOT EXISTS "thumbnailUrl" VARCHAR,
  ADD COLUMN IF NOT EXISTS "deepLink" VARCHAR,
  ADD COLUMN IF NOT EXISTS "ctaText" VARCHAR DEFAULT 'Learn More',
  ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "advertiserName" VARCHAR,
  ADD COLUMN IF NOT EXISTS "advertiserLogo" VARCHAR;

-- Index for fast ad serving: placement + status + date range + priority
CREATE INDEX IF NOT EXISTS idx_promotions_serving
  ON promotions (placement, status, "startDate", "endDate", priority DESC);

-- Index for active ad lookup
CREATE INDEX IF NOT EXISTS idx_promotions_active_placement
  ON promotions (placement, status) WHERE status = 'active';
