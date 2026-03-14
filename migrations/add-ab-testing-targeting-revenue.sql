-- Phase 5 & 6 Migration: A/B Testing, Audience Targeting, Revenue & Billing
-- Run: psql -U postgres -d evrs -f migrations/add-ab-testing-targeting-revenue.sql

-- Create billing_model enum
DO $$ BEGIN
  CREATE TYPE billing_model_enum AS ENUM ('cpm', 'cpc', 'cpa', 'flat');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create ab_test_status enum
DO $$ BEGIN
  CREATE TYPE ab_test_status_enum AS ENUM ('draft', 'running', 'paused', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── A/B Tests Table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  status ab_test_status_enum NOT NULL DEFAULT 'draft',
  "variantIds" JSONB NOT NULL DEFAULT '[]',
  "trafficSplit" JSONB NOT NULL DEFAULT '[]',
  "variantLabels" JSONB NOT NULL DEFAULT '[]',
  "goalMetric" VARCHAR NOT NULL DEFAULT 'ctr',
  "minSampleSize" INT NOT NULL DEFAULT 100,
  "confidenceThreshold" INT NOT NULL DEFAULT 95,
  "winnerId" UUID,
  "startDate" TIMESTAMP,
  "endDate" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests (status);

-- ── Promotion: A/B Testing columns ─────────────────────────

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "abTestId" UUID;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "variantLabel" VARCHAR;

-- ── Promotion: Audience Targeting columns ───────────────────

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "targetVehicleTypes" JSONB;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "targetVehicleBrands" JSONB;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "targetUserRoles" JSONB;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "targetMinAccountAgeDays" INT;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "targetMaxAccountAgeDays" INT;

-- ── Promotion: Revenue / Billing columns ────────────────────

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "billingModel" billing_model_enum NOT NULL DEFAULT 'cpm';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "billingRate" DECIMAL(10,4) NOT NULL DEFAULT 0;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "budgetCap" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS "totalSpend" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- ── Ad Impressions: add metadata for A/B variant tracking ───

ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS "abTestId" UUID;
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS "variantLabel" VARCHAR;

CREATE INDEX IF NOT EXISTS idx_ad_impressions_ab_test ON ad_impressions ("abTestId", "promotionId", "eventType");

-- ── Revenue Ledger Table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_revenue_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "promotionId" UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  "eventType" VARCHAR NOT NULL, -- impression, click, conversion
  "eventCount" INT NOT NULL DEFAULT 1,
  "unitRate" DECIMAL(10,4) NOT NULL,
  "amount" DECIMAL(12,4) NOT NULL,
  "billingModel" billing_model_enum NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_revenue_promotion ON ad_revenue_ledger ("promotionId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_ad_revenue_date ON ad_revenue_ledger ("createdAt");

-- Done
SELECT 'Phase 5 & 6 migration complete' AS result;
