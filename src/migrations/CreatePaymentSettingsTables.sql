-- Migration: Create Payment Settings Tables
-- Date: 2025-12-05
-- Description: Create payment_methods and user_payment_settings tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'card',
    "cardBrand" VARCHAR(50),
    "lastFour" VARCHAR(4),
    "expiryMonth" VARCHAR(2),
    "expiryYear" VARCHAR(2),
    "cardholderName" VARCHAR(255),
    token VARCHAR(255),
    "isDefault" BOOLEAN DEFAULT false,
    "billingAddress" JSONB,
    metadata TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_payment_method_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create user_payment_settings table
CREATE TABLE IF NOT EXISTS user_payment_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID UNIQUE NOT NULL,
    "autoPayEnabled" BOOLEAN DEFAULT false,
    "saveReceipts" BOOLEAN DEFAULT true,
    "emailNotifications" BOOLEAN DEFAULT true,
    "smsNotifications" BOOLEAN DEFAULT true,
    currency VARCHAR(10) DEFAULT 'LKR',
    "dailySpendingLimit" DECIMAL(10, 2),
    "monthlySpendingLimit" DECIMAL(10, 2),
    "requirePinForPayments" BOOLEAN DEFAULT false,
    "paymentPinHash" VARCHAR(255),
    "transactionAlerts" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_payment_settings_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods("userId");
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods("isDefault") WHERE "isDefault" = true;
CREATE INDEX IF NOT EXISTS idx_user_payment_settings_user_id ON user_payment_settings("userId");

-- Add check constraints for valid enum values
ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS chk_payment_method_type;
ALTER TABLE payment_methods ADD CONSTRAINT chk_payment_method_type 
  CHECK (type IN ('card', 'wallet', 'bank'));

-- Add comments for documentation
COMMENT ON TABLE payment_methods IS 'Stores user payment methods (cards, wallets, bank accounts)';
COMMENT ON TABLE user_payment_settings IS 'Stores user payment preferences and security settings';
COMMENT ON COLUMN payment_methods."userId" IS 'Foreign key to users table';
COMMENT ON COLUMN payment_methods.type IS 'Payment method type: card, wallet, or bank';
COMMENT ON COLUMN payment_methods."lastFour" IS 'Last 4 digits of card number';
COMMENT ON COLUMN payment_methods.token IS 'Payment gateway token (PayHere, Stripe, etc.)';
COMMENT ON COLUMN payment_methods."isDefault" IS 'Whether this is the default payment method';
COMMENT ON COLUMN user_payment_settings."paymentPinHash" IS 'Bcrypt hashed PIN for payment verification';
