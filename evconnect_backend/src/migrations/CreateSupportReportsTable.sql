-- Create support_reports table
CREATE TABLE IF NOT EXISTS support_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    "adminResponse" TEXT,
    "userId" UUID,
    "respondedBy" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" TIMESTAMP,
    CONSTRAINT fk_support_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_support_responder FOREIGN KEY ("respondedBy") REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_support_reports_user_id ON support_reports("userId");
CREATE INDEX IF NOT EXISTS idx_support_reports_status ON support_reports(status);
CREATE INDEX IF NOT EXISTS idx_support_reports_created_at ON support_reports("createdAt");

-- Add check constraints
ALTER TABLE support_reports
ADD CONSTRAINT chk_support_status 
CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed'));

ALTER TABLE support_reports
ADD CONSTRAINT chk_support_category 
CHECK (category IN ('Technical Issue', 'Payment Problem', 'Charger Issue', 'Account Problem', 'Booking Issue', 'App Performance', 'Other'));
