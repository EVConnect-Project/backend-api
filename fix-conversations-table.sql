-- Fix conversations table schema
-- Add missing type column and rename mechanicId to participant_id

-- Step 1: Add type column if it doesn't exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS type varchar(50) DEFAULT 'direct';

-- Step 2: Add participant_id column if it doesn't exist (rename mechanicId)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS participant_id uuid;

-- Step 3: Copy mechanicId data to participant_id if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'mechanicid') THEN
        UPDATE conversations SET participant_id = mechanicId WHERE participant_id IS NULL;
        ALTER TABLE conversations DROP COLUMN mechanicId;
    END IF;
END $$;

-- Step 4: Add other missing columns if they don't exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS reference_id uuid;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS reference_type varchar(100);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at timestamp;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count_user integer DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count_participant integer DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Step 5: Copy userId data if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'userid') THEN
        UPDATE conversations SET user_id = userId WHERE user_id IS NULL;
    END IF;
END $$;

-- Step 6: Show final table structure
\d conversations;