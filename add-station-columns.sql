-- Add stationId and chargerIdentifier columns to chargers table if they don't exist

-- Add stationId column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chargers' AND column_name = 'stationId'
    ) THEN
        ALTER TABLE chargers ADD COLUMN "stationId" uuid NULL;
        RAISE NOTICE 'Column stationId added to chargers table';
    ELSE
        RAISE NOTICE 'Column stationId already exists in chargers table';
    END IF;
END $$;

-- Add chargerIdentifier column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chargers' AND column_name = 'chargerIdentifier'
    ) THEN
        ALTER TABLE chargers ADD COLUMN "chargerIdentifier" varchar(100) NULL;
        RAISE NOTICE 'Column chargerIdentifier added to chargers table';
    ELSE
        RAISE NOTICE 'Column chargerIdentifier already exists in chargers table';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'chargers' 
  AND column_name IN ('stationId', 'chargerIdentifier')
ORDER BY column_name;

