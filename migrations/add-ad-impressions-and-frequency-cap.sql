-- Phase 2 Migration: Per-user ad tracking + frequency capping
-- Run after: add-ad-system-columns-to-promotions.sql

-- 1. Create ad_event_type enum
DO $$ BEGIN
  CREATE TYPE ad_event_type_enum AS ENUM ('impression', 'click', 'conversion', 'dismiss');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create ad_impressions table for per-user event tracking
CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" VARCHAR NOT NULL,
  "promotionId" UUID NOT NULL,
  "eventType" ad_event_type_enum NOT NULL,
  placement ad_placement_enum,
  metadata JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_ad_impressions_promotion
    FOREIGN KEY ("promotionId") REFERENCES promotions(id) ON DELETE CASCADE
);

-- 3. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_promo_event
  ON ad_impressions ("userId", "promotionId", "eventType");

CREATE INDEX IF NOT EXISTS idx_ad_impressions_promo_event_date
  ON ad_impressions ("promotionId", "eventType", "createdAt");

CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_promo_date
  ON ad_impressions ("userId", "promotionId", "createdAt");

-- 4. Add frequency cap column to promotions
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS "maxImpressionsPerUserPerDay" INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN promotions."maxImpressionsPerUserPerDay"
  IS 'Max impressions per user per day. 0 = unlimited';
