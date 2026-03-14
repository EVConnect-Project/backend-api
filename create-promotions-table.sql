-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'charger_discount' CHECK (type IN ('charger_discount', 'brand_partnership', 'marketplace_deal', 'service_offer', 'local_business')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('active', 'scheduled', 'expired', 'draft')),
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "targetAudience" JSONB DEFAULT '[]'::jsonb,
  "iconName" VARCHAR(100) DEFAULT 'electric_bolt',
  "gradientColors" JSONB DEFAULT '["#1E4DB7", "#2F6FED"]'::jsonb,
  "badgeText" VARCHAR(50),
  "actionUrl" VARCHAR(500) NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_PROMOTIONS_STATUS" ON promotions(status);
CREATE INDEX IF NOT EXISTS "IDX_PROMOTIONS_DATES" ON promotions("startDate", "endDate");
CREATE INDEX IF NOT EXISTS "IDX_PROMOTIONS_TYPE" ON promotions(type);

-- Insert some sample data
INSERT INTO promotions (title, subtitle, description, type, status, "startDate", "endDate", "targetAudience", "iconName", "gradientColors", "badgeText", "actionUrl", impressions, clicks, conversions)
VALUES 
  ('Save 30% on Fast Charging', 'Limited Winter Offer', 'Get 30% off on all DC fast charging stations during January 2026', 'charger_discount', 'active', '2026-01-01', '2026-01-31', '["all"]'::jsonb, 'electric_bolt', '["#1E4DB7", "#2F6FED"]'::jsonb, 'PROMO', '/chargers', 12450, 1089, 234),
  ('Tesla Model Y Test Drive', 'Exclusive for EVRS Members', 'Book a free test drive of the new Tesla Model Y at our partner showrooms', 'brand_partnership', 'active', '2026-01-01', '2026-02-28', '["premium"]'::jsonb, 'drive_eta', '["#8B5CF6", "#EC4899"]'::jsonb, 'NEW', '/marketplace', 8920, 756, 45),
  ('EV Accessories Sale', 'Up to 50% Off', 'Premium charging cables, adapters, and accessories at discounted prices', 'marketplace_deal', 'active', '2026-01-01', '2026-01-15', '["all"]'::jsonb, 'shopping_bag', '["#EF4444", "#F97316"]'::jsonb, 'HOT', '/marketplace', 15680, 1342, 178),
  ('Free Vehicle Health Check', 'Book Certified Mechanics', 'Complimentary comprehensive EV health check with our certified mechanics', 'service_offer', 'active', '2026-01-01', '2026-01-31', '["all"]'::jsonb, 'build_circle', '["#10B981", "#14B8A6"]'::jsonb, 'FREE', '/mechanics', 6340, 892, 123),
  ('Charge & Dine Rewards', 'Partner Restaurants & Cafes', 'Earn dining vouchers when you charge at participating locations', 'local_business', 'active', '2026-01-01', '2026-03-31', '["all"]'::jsonb, 'restaurant', '["#F59E0B", "#EF4444"]'::jsonb, 'PARTNER', '/chargers', 4230, 523, 89)
ON CONFLICT DO NOTHING;

SELECT 'Promotions table created successfully!' as message;
