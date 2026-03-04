-- Create mechanic_expertise table with proper column casing
CREATE TABLE mechanic_expertise (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "mechanicId" uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
    "problemType" character varying(50) NOT NULL,
    "jobsCompleted" integer NOT NULL DEFAULT 0,
    "jobsSuccessful" integer NOT NULL DEFAULT 0,
    "avgResolutionMinutes" integer,
    "avgSatisfactionRating" numeric(3,2),
    "lastJobAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_mechanic_expertise" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_mechanic_expertise_mechanic_problem" UNIQUE ("mechanicId", "problemType")
);

-- Create indexes
CREATE INDEX "IDX_mechanic_expertise_mechanicId" ON mechanic_expertise ("mechanicId");
CREATE INDEX "IDX_mechanic_expertise_problemType" ON mechanic_expertise ("problemType");

-- Add columns to emergency_requests if they don't exist
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS "problemType" character varying(50);
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS "resolutionTimeMinutes" integer;
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS "userSatisfactionRating" numeric(3,2);
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS "mechanicFeedback" text;

-- Create index on problemType
CREATE INDEX IF NOT EXISTS IDX_emergency_requests_problemType ON emergency_requests ("problemType");
