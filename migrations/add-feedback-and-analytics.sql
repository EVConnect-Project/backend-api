-- Migration: Add feedback and analytics system
-- Date: 2024-12-14

-- Create emergency_feedback table
CREATE TABLE IF NOT EXISTS emergency_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_request_id UUID REFERENCES emergency_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
    
    -- Rating (1-5 stars)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    response_time_rating INTEGER CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
    service_quality_rating INTEGER CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    
    -- Feedback details
    comment TEXT,
    positive_aspects TEXT[], -- Array of positive tags
    negative_aspects TEXT[], -- Array of negative tags
    would_recommend BOOLEAN DEFAULT TRUE,
    
    -- Issue tracking
    had_issues BOOLEAN DEFAULT FALSE,
    issue_types TEXT[], -- Array: ['late_arrival', 'poor_service', 'high_price', 'unprofessional']
    issue_description TEXT,
    
    -- AI improvement
    ai_recommendation_helpful BOOLEAN,
    ai_eta_accurate BOOLEAN,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one feedback per emergency
    UNIQUE(emergency_request_id)
);

-- Create mechanic_analytics table (aggregated metrics)
CREATE TABLE IF NOT EXISTS mechanic_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE UNIQUE,
    
    -- Performance metrics
    total_completed_jobs INTEGER DEFAULT 0,
    total_cancelled_jobs INTEGER DEFAULT 0,
    total_declined_jobs INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 100.00,
    
    -- Rating metrics
    average_overall_rating DECIMAL(3,2),
    average_response_time_rating DECIMAL(3,2),
    average_service_quality_rating DECIMAL(3,2),
    average_professionalism_rating DECIMAL(3,2),
    average_value_rating DECIMAL(3,2),
    total_ratings INTEGER DEFAULT 0,
    
    -- Time metrics
    average_response_time_minutes DECIMAL(8,2),
    average_arrival_time_minutes DECIMAL(8,2),
    average_service_duration_minutes DECIMAL(8,2),
    fastest_response_time_minutes DECIMAL(8,2),
    
    -- Recommendation metrics
    recommendation_rate DECIMAL(5,2) DEFAULT 100.00,
    repeat_customer_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Issue tracking
    total_issues_reported INTEGER DEFAULT 0,
    late_arrival_count INTEGER DEFAULT 0,
    poor_service_count INTEGER DEFAULT 0,
    high_price_complaints INTEGER DEFAULT 0,
    unprofessional_count INTEGER DEFAULT 0,
    
    -- Revenue metrics
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    average_job_value DECIMAL(10,2),
    
    -- AI metrics
    ai_recommendation_accuracy DECIMAL(5,2),
    ai_eta_accuracy DECIMAL(5,2),
    
    -- Timestamps
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_analytics table (overall system metrics)
CREATE TABLE IF NOT EXISTS system_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    
    -- Volume metrics
    total_emergency_requests INTEGER DEFAULT 0,
    total_completed_emergencies INTEGER DEFAULT 0,
    total_cancelled_emergencies INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_response_time_minutes DECIMAL(8,2),
    average_arrival_time_minutes DECIMAL(8,2),
    average_service_duration_minutes DECIMAL(8,2),
    
    -- Rating metrics
    average_overall_rating DECIMAL(3,2),
    total_feedbacks_received INTEGER DEFAULT 0,
    
    -- AI metrics
    ai_recommendation_success_rate DECIMAL(5,2),
    ai_eta_accuracy_rate DECIMAL(5,2),
    average_ai_score DECIMAL(5,2),
    
    -- User metrics
    new_users_registered INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    
    -- Mechanic metrics
    new_mechanics_registered INTEGER DEFAULT 0,
    active_mechanics INTEGER DEFAULT 0,
    
    -- Revenue metrics
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_feedback_user_id ON emergency_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_feedback_mechanic_id ON emergency_feedback(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_emergency_feedback_emergency_request_id ON emergency_feedback(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_emergency_feedback_created_at ON emergency_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_emergency_feedback_overall_rating ON emergency_feedback(overall_rating);
CREATE INDEX IF NOT EXISTS idx_mechanic_analytics_mechanic_id ON mechanic_analytics(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_system_analytics_date ON system_analytics(date);

-- Trigger to update mechanic_analytics when feedback is added
CREATE OR REPLACE FUNCTION update_mechanic_analytics_on_feedback()
RETURNS TRIGGER AS $$
DECLARE
    v_mechanic_id UUID;
    v_total_ratings INTEGER;
    v_total_jobs INTEGER;
    v_completed_jobs INTEGER;
BEGIN
    v_mechanic_id := NEW.mechanic_id;
    
    -- Get total ratings count
    SELECT COUNT(*) INTO v_total_ratings
    FROM emergency_feedback
    WHERE mechanic_id = v_mechanic_id;
    
    -- Get job counts
    SELECT 
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'cancelled')
    INTO v_completed_jobs, v_total_jobs
    FROM emergency_requests
    WHERE mechanic_id = v_mechanic_id;
    
    -- Insert or update mechanic_analytics
    INSERT INTO mechanic_analytics (
        mechanic_id,
        average_overall_rating,
        average_response_time_rating,
        average_service_quality_rating,
        average_professionalism_rating,
        average_value_rating,
        total_ratings,
        total_completed_jobs,
        recommendation_rate,
        total_issues_reported,
        late_arrival_count,
        poor_service_count,
        high_price_complaints,
        unprofessional_count,
        last_calculated_at
    )
    SELECT
        v_mechanic_id,
        AVG(overall_rating),
        AVG(response_time_rating),
        AVG(service_quality_rating),
        AVG(professionalism_rating),
        AVG(value_rating),
        v_total_ratings,
        v_completed_jobs,
        (COUNT(*) FILTER (WHERE would_recommend = TRUE)::DECIMAL / NULLIF(COUNT(*), 0) * 100),
        SUM(CASE WHEN had_issues THEN 1 ELSE 0 END),
        SUM(CASE WHEN 'late_arrival' = ANY(issue_types) THEN 1 ELSE 0 END),
        SUM(CASE WHEN 'poor_service' = ANY(issue_types) THEN 1 ELSE 0 END),
        SUM(CASE WHEN 'high_price' = ANY(issue_types) THEN 1 ELSE 0 END),
        SUM(CASE WHEN 'unprofessional' = ANY(issue_types) THEN 1 ELSE 0 END),
        CURRENT_TIMESTAMP
    FROM emergency_feedback
    WHERE mechanic_id = v_mechanic_id
    ON CONFLICT (mechanic_id) 
    DO UPDATE SET
        average_overall_rating = EXCLUDED.average_overall_rating,
        average_response_time_rating = EXCLUDED.average_response_time_rating,
        average_service_quality_rating = EXCLUDED.average_service_quality_rating,
        average_professionalism_rating = EXCLUDED.average_professionalism_rating,
        average_value_rating = EXCLUDED.average_value_rating,
        total_ratings = EXCLUDED.total_ratings,
        total_completed_jobs = EXCLUDED.total_completed_jobs,
        recommendation_rate = EXCLUDED.recommendation_rate,
        total_issues_reported = EXCLUDED.total_issues_reported,
        late_arrival_count = EXCLUDED.late_arrival_count,
        poor_service_count = EXCLUDED.poor_service_count,
        high_price_complaints = EXCLUDED.high_price_complaints,
        unprofessional_count = EXCLUDED.unprofessional_count,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_mechanic_analytics_on_feedback
    AFTER INSERT OR UPDATE ON emergency_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_mechanic_analytics_on_feedback();

-- Function to update system analytics daily
CREATE OR REPLACE FUNCTION update_system_analytics_daily()
RETURNS void AS $$
DECLARE
    v_date DATE := CURRENT_DATE;
BEGIN
    INSERT INTO system_analytics (
        date,
        total_emergency_requests,
        total_completed_emergencies,
        total_cancelled_emergencies,
        average_response_time_minutes,
        average_arrival_time_minutes,
        average_overall_rating,
        total_feedbacks_received,
        ai_recommendation_success_rate,
        average_ai_score
    )
    SELECT
        v_date,
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        AVG(response_time_minutes),
        AVG(arrival_time_minutes),
        (SELECT AVG(overall_rating) FROM emergency_feedback WHERE DATE(created_at) = v_date),
        (SELECT COUNT(*) FROM emergency_feedback WHERE DATE(created_at) = v_date),
        -- AI recommendation success: if user selected AI recommended mechanic
        (COUNT(*) FILTER (WHERE ai_score >= 80)::DECIMAL / NULLIF(COUNT(*), 0) * 100),
        AVG(ai_score)
    FROM emergency_requests
    WHERE DATE(created_at) = v_date
    ON CONFLICT (date)
    DO UPDATE SET
        total_emergency_requests = EXCLUDED.total_emergency_requests,
        total_completed_emergencies = EXCLUDED.total_completed_emergencies,
        total_cancelled_emergencies = EXCLUDED.total_cancelled_emergencies,
        average_response_time_minutes = EXCLUDED.average_response_time_minutes,
        average_arrival_time_minutes = EXCLUDED.average_arrival_time_minutes,
        average_overall_rating = EXCLUDED.average_overall_rating,
        total_feedbacks_received = EXCLUDED.total_feedbacks_received,
        ai_recommendation_success_rate = EXCLUDED.ai_recommendation_success_rate,
        average_ai_score = EXCLUDED.average_ai_score,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Insert initial analytics records for existing mechanics
INSERT INTO mechanic_analytics (mechanic_id)
SELECT id FROM mechanics
ON CONFLICT (mechanic_id) DO NOTHING;

-- Comments
COMMENT ON TABLE emergency_feedback IS 'User feedback and ratings for completed emergency services';
COMMENT ON TABLE mechanic_analytics IS 'Aggregated performance analytics for each mechanic';
COMMENT ON TABLE system_analytics IS 'Daily system-wide analytics and metrics';
COMMENT ON COLUMN emergency_feedback.positive_aspects IS 'Array of positive tags like [''punctual'', ''professional'', ''friendly'']';
COMMENT ON COLUMN emergency_feedback.negative_aspects IS 'Array of negative tags like [''late'', ''expensive'', ''unprofessional'']';
COMMENT ON COLUMN emergency_feedback.issue_types IS 'Array of issue categories for tracking common problems';
