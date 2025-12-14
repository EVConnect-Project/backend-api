-- Add real-time availability tracking and response time analytics

-- Add availability tracking fields to mechanics table
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS current_location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS current_location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS is_on_job BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS average_response_time_minutes INT DEFAULT 15,
ADD COLUMN IF NOT EXISTS total_emergency_calls INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS accepted_emergency_calls INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS declined_emergency_calls INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS acceptance_rate DECIMAL(5, 2) DEFAULT 0.0;

-- Create emergency_requests table for tracking
CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,
    request_lat DECIMAL(10, 8) NOT NULL,
    request_lng DECIMAL(11, 8) NOT NULL,
    problem_type VARCHAR(50),
    urgency_level VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, completed, cancelled
    requested_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    arrived_at TIMESTAMP,
    completed_at TIMESTAMP,
    response_time_minutes INT,
    arrival_time_minutes INT,
    ai_score DECIMAL(5, 2),
    distance_km DECIMAL(6, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create mechanic_availability_log table for real-time tracking
CREATE TABLE IF NOT EXISTS mechanic_availability_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
    available BOOLEAN NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    is_on_job BOOLEAN DEFAULT FALSE,
    logged_at TIMESTAMP DEFAULT NOW()
);

-- Create mechanic_performance_metrics table
CREATE TABLE IF NOT EXISTS mechanic_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE UNIQUE,
    total_jobs INT DEFAULT 0,
    completed_jobs INT DEFAULT 0,
    cancelled_jobs INT DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.0,
    average_response_time_minutes INT DEFAULT 15,
    fastest_response_time_minutes INT,
    average_arrival_time_minutes INT,
    total_revenue DECIMAL(10, 2) DEFAULT 0.0,
    emergency_acceptance_rate DECIMAL(5, 2) DEFAULT 0.0,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_requests_user_id ON emergency_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_mechanic_id ON emergency_requests(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_requested_at ON emergency_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_mechanic_availability_log_mechanic_id ON mechanic_availability_log(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_availability_log_logged_at ON mechanic_availability_log(logged_at);
CREATE INDEX IF NOT EXISTS idx_mechanics_location ON mechanics(current_location_lat, current_location_lng);

-- Create trigger to update mechanic metrics
CREATE OR REPLACE FUNCTION update_mechanic_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update performance metrics
        INSERT INTO mechanic_performance_metrics (
            mechanic_id,
            total_jobs,
            completed_jobs,
            average_response_time_minutes,
            average_arrival_time_minutes,
            last_updated
        )
        VALUES (
            NEW.mechanic_id,
            1,
            1,
            COALESCE(NEW.response_time_minutes, 15),
            COALESCE(NEW.arrival_time_minutes, 30),
            NOW()
        )
        ON CONFLICT (mechanic_id) DO UPDATE SET
            total_jobs = mechanic_performance_metrics.total_jobs + 1,
            completed_jobs = mechanic_performance_metrics.completed_jobs + 1,
            average_response_time_minutes = (
                (mechanic_performance_metrics.average_response_time_minutes * mechanic_performance_metrics.completed_jobs + COALESCE(NEW.response_time_minutes, 15)) 
                / (mechanic_performance_metrics.completed_jobs + 1)
            ),
            average_arrival_time_minutes = (
                (COALESCE(mechanic_performance_metrics.average_arrival_time_minutes, 30) * mechanic_performance_metrics.completed_jobs + COALESCE(NEW.arrival_time_minutes, 30)) 
                / (mechanic_performance_metrics.completed_jobs + 1)
            ),
            last_updated = NOW();
            
        -- Update mechanic's acceptance rate
        UPDATE mechanics
        SET 
            total_emergency_calls = total_emergency_calls + 1,
            accepted_emergency_calls = accepted_emergency_calls + 1,
            acceptance_rate = (accepted_emergency_calls + 1)::DECIMAL / (total_emergency_calls + 1) * 100
        WHERE id = NEW.mechanic_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mechanic_metrics
AFTER UPDATE ON emergency_requests
FOR EACH ROW
EXECUTE FUNCTION update_mechanic_metrics();

-- Insert sample performance data for existing mechanics
INSERT INTO mechanic_performance_metrics (mechanic_id, total_jobs, completed_jobs, average_rating, average_response_time_minutes, average_arrival_time_minutes)
SELECT 
    m.id,
    FLOOR(RANDOM() * 100 + 20)::INT as total_jobs,
    FLOOR(RANDOM() * 90 + 15)::INT as completed_jobs,
    m.rating,
    FLOOR(RANDOM() * 15 + 5)::INT as average_response_time_minutes,
    FLOOR(RANDOM() * 30 + 10)::INT as average_arrival_time_minutes
FROM mechanics m
WHERE m.id IS NOT NULL
ON CONFLICT (mechanic_id) DO NOTHING;

COMMENT ON TABLE emergency_requests IS 'Tracks all emergency breakdown requests and responses';
COMMENT ON TABLE mechanic_availability_log IS 'Real-time log of mechanic availability and location';
COMMENT ON TABLE mechanic_performance_metrics IS 'Aggregated performance metrics for AI recommendations';
