-- Create base emergency system schema
-- Run this BEFORE other migrations

-- Create mechanics table
CREATE TABLE IF NOT EXISTS mechanics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    services TEXT[] DEFAULT '{}',
    specialization VARCHAR(255),
    years_of_experience INT DEFAULT 0,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(11, 7) NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    phone VARCHAR(20),
    email VARCHAR(255),
    description TEXT,
    available BOOLEAN DEFAULT true,
    price_per_hour DECIMAL(10, 2),
    completed_jobs INT DEFAULT 0,
    license_number VARCHAR(100),
    current_location_lat DECIMAL(10, 7),
    current_location_lng DECIMAL(11, 7),
    is_on_job BOOLEAN DEFAULT false,
    last_online_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create emergency_requests table
CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "mechanicId" UUID REFERENCES mechanics(id) ON DELETE SET NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(11, 7) NOT NULL,
    "problemType" VARCHAR(50),
    "problemDescription" TEXT,
    "urgencyLevel" VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    "userPhone" VARCHAR(20),
    "vehicleInfo" TEXT,
    "estimatedCost" DECIMAL(10, 2),
    "actualCost" DECIMAL(10, 2),
    "completionNotes" TEXT,
    "completedAt" TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create mechanic_responses table
CREATE TABLE IF NOT EXISTS mechanic_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "emergencyRequestId" UUID NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    "mechanicId" UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    "estimatedArrival" TIMESTAMP,
    "estimatedCost" DECIMAL(10, 2),
    message TEXT,
    "aiScore" DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create emergency_feedback table (for Phase 5)
CREATE TABLE IF NOT EXISTS emergency_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "mechanicId" UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
    "emergencyRequestId" UUID NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    overall_rating INT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    response_time_rating INT NOT NULL CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
    service_quality_rating INT NOT NULL CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
    professionalism_rating INT NOT NULL CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    value_rating INT NOT NULL CHECK (value_rating >= 1 AND value_rating <= 5),
    comment TEXT,
    positive_aspects TEXT[] DEFAULT '{}',
    negative_aspects TEXT[] DEFAULT '{}',
    would_recommend BOOLEAN DEFAULT true,
    had_issues BOOLEAN DEFAULT false,
    issue_types TEXT[] DEFAULT '{}',
    issue_description TEXT,
    ai_recommendation_helpful BOOLEAN,
    ai_eta_accurate BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE("emergencyRequestId")
);

-- Create mechanic_analytics table (for Phase 5)
CREATE TABLE IF NOT EXISTS mechanic_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE UNIQUE,
    total_completed_jobs INT DEFAULT 0,
    total_feedback_count INT DEFAULT 0,
    average_overall_rating DECIMAL(3, 2) DEFAULT 0.00,
    average_response_time_rating DECIMAL(3, 2) DEFAULT 0.00,
    average_service_quality_rating DECIMAL(3, 2) DEFAULT 0.00,
    average_professionalism_rating DECIMAL(3, 2) DEFAULT 0.00,
    average_value_rating DECIMAL(3, 2) DEFAULT 0.00,
    average_response_time_minutes INT DEFAULT 0,
    completion_rate DECIMAL(5, 2) DEFAULT 0.00,
    recommendation_rate DECIMAL(5, 2) DEFAULT 0.00,
    total_issues_reported INT DEFAULT 0,
    pricing_issues_count INT DEFAULT 0,
    service_quality_issues_count INT DEFAULT 0,
    professionalism_issues_count INT DEFAULT 0,
    other_issues_count INT DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    ai_recommendation_accuracy DECIMAL(5, 2) DEFAULT 0.00,
    ai_eta_accuracy DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mechanics_user_id ON mechanics(user_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_location ON mechanics(lat, lng);
CREATE INDEX IF NOT EXISTS idx_mechanics_available ON mechanics(available);

CREATE INDEX IF NOT EXISTS idx_emergency_requests_user_id ON emergency_requests("userId");
CREATE INDEX IF NOT EXISTS idx_emergency_requests_mechanic_id ON emergency_requests("mechanicId");
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON emergency_requests(status);

CREATE INDEX IF NOT EXISTS idx_mechanic_responses_emergency_id ON mechanic_responses("emergencyRequestId");
CREATE INDEX IF NOT EXISTS idx_mechanic_responses_mechanic_id ON mechanic_responses("mechanicId");

CREATE INDEX IF NOT EXISTS idx_emergency_feedback_mechanic_id ON emergency_feedback("mechanicId");
CREATE INDEX IF NOT EXISTS idx_emergency_feedback_user_id ON emergency_feedback("userId");

COMMENT ON TABLE mechanics IS 'Stores information about mechanics available for emergency breakdown assistance';
COMMENT ON TABLE emergency_requests IS 'Tracks all emergency breakdown requests from users';
COMMENT ON TABLE mechanic_responses IS 'Stores mechanic responses to emergency requests';
COMMENT ON TABLE emergency_feedback IS 'User feedback for completed emergency services';
COMMENT ON TABLE mechanic_analytics IS 'Aggregated performance analytics for mechanics';
