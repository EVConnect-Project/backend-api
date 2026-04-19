-- Fix chargers.station_id FK to reference charging_stations(id)
-- This resolves station registration failures when FK still points to legacy stations table.

ALTER TABLE chargers DROP CONSTRAINT IF EXISTS "FK_ed8f8a811b1db2359c8a3f4c49b";
ALTER TABLE chargers DROP CONSTRAINT IF EXISTS "fk_chargers_station_ref";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chargers'
      AND column_name = 'station_id'
  ) THEN
    ALTER TABLE chargers
      ADD CONSTRAINT "fk_chargers_station_ref"
      FOREIGN KEY (station_id)
      REFERENCES charging_stations(id)
      ON DELETE CASCADE;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chargers'
      AND column_name = 'stationId'
  ) THEN
    ALTER TABLE chargers
      ADD CONSTRAINT "fk_chargers_station_ref"
      FOREIGN KEY ("stationId")
      REFERENCES charging_stations(id)
      ON DELETE CASCADE;
  END IF;
END $$;
