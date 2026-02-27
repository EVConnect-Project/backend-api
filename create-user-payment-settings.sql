-- Create user_payment_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_payment_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" uuid NOT NULL UNIQUE,
    "paymentPin" varchar,
    "createdAt" timestamp DEFAULT NOW(),
    "updatedAt" timestamp DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_payment_settings_userId ON user_payment_settings("userId");

-- Verify
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_payment_settings' 
ORDER BY ordinal_position;
