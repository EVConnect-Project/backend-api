-- Migration: Add Notification System Tables
-- Created: 2025-12-02
-- Description: Creates tables for FCM tokens and notification logs

-- Create fcm_tokens table
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "fcmToken" TEXT NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL,
  "deviceId" VARCHAR(255),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fcm_tokens
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON fcm_tokens("isActive");
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_platform ON fcm_tokens(platform);

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  "sentAt" TIMESTAMP,
  "readAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs("userId");
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs("createdAt" DESC);

-- Create trigger function for updating fcm_tokens.updatedAt
CREATE OR REPLACE FUNCTION update_fcm_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for fcm_tokens
DROP TRIGGER IF EXISTS trigger_update_fcm_tokens_updated_at ON fcm_tokens;
CREATE TRIGGER trigger_update_fcm_tokens_updated_at
BEFORE UPDATE ON fcm_tokens
FOR EACH ROW
EXECUTE FUNCTION update_fcm_tokens_updated_at();

-- Add comments
COMMENT ON TABLE fcm_tokens IS 'Stores Firebase Cloud Messaging tokens for push notifications';
COMMENT ON TABLE notification_logs IS 'Logs all notifications sent to users';
COMMENT ON COLUMN fcm_tokens."userId" IS 'Reference to user who owns this device token';
COMMENT ON COLUMN fcm_tokens."fcmToken" IS 'Firebase Cloud Messaging token';
COMMENT ON COLUMN fcm_tokens.platform IS 'Device platform: ios, android, or web';
COMMENT ON COLUMN fcm_tokens."deviceId" IS 'Optional device identifier for tracking';
COMMENT ON COLUMN fcm_tokens."isActive" IS 'Whether token is currently active (false if expired/invalid)';
COMMENT ON COLUMN notification_logs.status IS 'Notification status: pending, sent, failed, or read';
