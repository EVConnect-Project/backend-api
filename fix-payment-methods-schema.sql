-- Add missing columns to payment_methods table
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "cardBrand" varchar;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "lastFour" varchar;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "expiryMonth" varchar;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "expiryYear" varchar;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "cardholderName" varchar;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "token" varchar;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "isDefault" boolean DEFAULT false;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "metadata" jsonb;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT NOW();
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT NOW();

-- Add missing columns to user_payment_settings table if not exists
ALTER TABLE user_payment_settings ADD COLUMN IF NOT EXISTS "paymentPin" varchar;
ALTER TABLE user_payment_settings ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT NOW();
ALTER TABLE user_payment_settings ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT NOW();

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_methods' 
ORDER BY ordinal_position;
