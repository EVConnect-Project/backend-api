-- Migration: Add notification preferences and FCM tokens
-- Date: 2024-12-13

-- Add FCM token and notification preferences to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS emergency_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS chat_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS promotional_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP;

-- Add FCM token for mechanics
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS emergency_alerts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP;

-- Create notification_logs table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'emergency_update', 'mechanic_assigned', 'emergency_alert', 'chat_message'
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'delivered', 'opened'
    fcm_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_mechanic_id ON notification_logs(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token) WHERE fcm_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mechanics_fcm_token ON mechanics(fcm_token) WHERE fcm_token IS NOT NULL;

-- Create notification_preferences table for advanced user settings
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Emergency notifications
    emergency_assigned BOOLEAN DEFAULT TRUE,
    emergency_en_route BOOLEAN DEFAULT TRUE,
    emergency_arrived BOOLEAN DEFAULT TRUE,
    emergency_working BOOLEAN DEFAULT TRUE,
    emergency_completed BOOLEAN DEFAULT TRUE,
    emergency_delayed BOOLEAN DEFAULT TRUE,
    emergency_cancelled BOOLEAN DEFAULT TRUE,
    
    -- Chat notifications
    chat_new_message BOOLEAN DEFAULT TRUE,
    chat_mechanic_typing BOOLEAN DEFAULT FALSE,
    
    -- Promotional notifications
    promo_new_offers BOOLEAN DEFAULT TRUE,
    promo_discounts BOOLEAN DEFAULT TRUE,
    promo_tips BOOLEAN DEFAULT FALSE,
    
    -- System notifications
    system_updates BOOLEAN DEFAULT TRUE,
    system_maintenance BOOLEAN DEFAULT TRUE,
    
    -- Notification settings
    sound_enabled BOOLEAN DEFAULT TRUE,
    vibration_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create mechanic notification preferences
CREATE TABLE IF NOT EXISTS mechanic_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE UNIQUE,
    
    -- Emergency alerts
    emergency_alerts_enabled BOOLEAN DEFAULT TRUE,
    emergency_alert_radius_km INTEGER DEFAULT 20,
    emergency_only_specialization BOOLEAN DEFAULT FALSE,
    
    -- Job notifications
    job_assigned BOOLEAN DEFAULT TRUE,
    job_cancelled BOOLEAN DEFAULT TRUE,
    job_reminder BOOLEAN DEFAULT TRUE,
    
    -- Chat notifications
    chat_new_message BOOLEAN DEFAULT TRUE,
    chat_user_typing BOOLEAN DEFAULT FALSE,
    
    -- System notifications
    system_updates BOOLEAN DEFAULT TRUE,
    performance_reports BOOLEAN DEFAULT TRUE,
    
    -- Notification settings
    sound_enabled BOOLEAN DEFAULT TRUE,
    vibration_enabled BOOLEAN DEFAULT TRUE,
    working_hours_only BOOLEAN DEFAULT FALSE,
    working_hours_start TIME,
    working_hours_end TIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function to update notification preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

CREATE TRIGGER trigger_mechanic_notification_preferences_updated_at
    BEFORE UPDATE ON mechanic_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Create default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM notification_preferences WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Create default preferences for existing mechanics
INSERT INTO mechanic_notification_preferences (mechanic_id)
SELECT id FROM mechanics
WHERE id NOT IN (SELECT mechanic_id FROM mechanic_notification_preferences WHERE mechanic_id IS NOT NULL)
ON CONFLICT (mechanic_id) DO NOTHING;

COMMENT ON TABLE notification_logs IS 'Logs all notifications sent through the system';
COMMENT ON TABLE notification_preferences IS 'User notification preferences and settings';
COMMENT ON TABLE mechanic_notification_preferences IS 'Mechanic notification preferences and settings';
COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
COMMENT ON COLUMN mechanics.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
