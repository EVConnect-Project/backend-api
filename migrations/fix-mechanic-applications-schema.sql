-- Fix mechanic_applications table schema to match entity
-- Drop existing table and recreate with correct schema

DROP TABLE IF EXISTS mechanic_applications CASCADE;

CREATE TABLE mechanic_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "fullName" VARCHAR(255) NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    skills TEXT NOT NULL,
    "yearsOfExperience" INT NOT NULL,
    certifications VARCHAR(500),
    "serviceArea" VARCHAR(255) NOT NULL,
    "serviceLat" DECIMAL(10, 7),
    "serviceLng" DECIMAL(10, 7),
    "licenseNumber" VARCHAR(100),
    "additionalInfo" TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    "reviewedBy" UUID REFERENCES users(id),
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_mechanic_applications_user_id ON mechanic_applications("userId");
CREATE INDEX idx_mechanic_applications_status ON mechanic_applications(status);
CREATE INDEX idx_mechanic_applications_location ON mechanic_applications("serviceLat", "serviceLng");