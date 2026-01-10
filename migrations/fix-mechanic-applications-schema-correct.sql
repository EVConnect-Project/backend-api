-- Fix mechanic_applications table schema to match current entity
-- This migration ensures the table structure matches MechanicApplication entity

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS mechanic_applications CASCADE;

-- Create table with correct schema matching the entity
CREATE TABLE mechanic_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    services TEXT[] NOT NULL,
    "yearsOfExperience" INTEGER NOT NULL,
    certifications TEXT,
    description TEXT,
    "pricePerHour" DECIMAL(10, 2) NOT NULL,
    "licenseNumber" TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    "reviewedAt" TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_mechanic_applications_user_id ON mechanic_applications("userId");
CREATE INDEX idx_mechanic_applications_status ON mechanic_applications(status);
CREATE INDEX idx_mechanic_applications_location ON mechanic_applications(lat, lng);

-- Ensure the enum type exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status_enum') THEN
        CREATE TYPE application_status_enum AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- Update status column to use enum
ALTER TABLE mechanic_applications ALTER COLUMN status TYPE application_status_enum USING status::application_status_enum;