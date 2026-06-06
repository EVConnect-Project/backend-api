import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Enable PostGIS and add geometry columns to the four lat/lng tables.
 *
 * Why this exists
 * ---------------
 * Every discovery query today (chargers nearby, mechanics nearby, service
 * stations nearby) materializes the whole candidate set and runs the
 * Haversine formula in SQL with no spatial index. At ~10K rows per table
 * this is fine; at 100K it falls over. PostGIS + GIST index brings this
 * down to a bounded-box index lookup followed by a sphere distance.
 *
 * What this migration does
 * ------------------------
 * 1. CREATE EXTENSION postgis (skips silently if already installed).
 * 2. For each table — chargers, charging_stations, mechanics, service_stations:
 *      a. Add a geometry(Point, 4326) column called `geom`.
 *      b. Backfill it from the existing lat / lng values.
 *      c. Create a GIST index on `geom`.
 *      d. Install a BEFORE INSERT OR UPDATE trigger that keeps `geom` in
 *         sync whenever lat or lng changes — application code can keep
 *         writing only lat / lng and PostgreSQL handles the projection.
 *
 * What this migration does NOT do
 * -------------------------------
 * It does not change any existing query. Hot-path queries opt into the new
 * column via `USE_POSTGIS=true` env flag in the application layer. That
 * leaves us with a reversible rollout: turn the flag off if the new query
 * misbehaves, fall straight back to Haversine, no schema rollback needed.
 *
 * Permissions
 * -----------
 * Running CREATE EXTENSION requires superuser on most managed Postgres
 * services. Render Postgres allows it; if a future host doesn't, the
 * migration will fail loudly here rather than silently producing a broken
 * schema.
 */
export class EnablePostGISGeometry1788000000000 implements MigrationInterface {
  name = "EnablePostGISGeometry1788000000000";

  private readonly tables: ReadonlyArray<{
    table: string;
    latCol: string;
    lngCol: string;
  }> = [
    { table: "chargers", latCol: "lat", lngCol: "lng" },
    { table: "charging_stations", latCol: "lat", lngCol: "lng" },
    { table: "mechanics", latCol: "lat", lngCol: "lng" },
    { table: "service_stations", latCol: "lat", lngCol: "lng" },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    // Single shared trigger function: keeps geom in sync with lat / lng on
    // any INSERT or UPDATE that touches either coordinate. The function is
    // SECURITY INVOKER (the default) so it runs with the caller's rights.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION evrs_sync_geom_from_latlng()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
          NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng::float8, NEW.lat::float8), 4326);
        ELSE
          NEW.geom := NULL;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    for (const { table } of this.tables) {
      // 1. column
      await queryRunner.query(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326)`,
      );

      // 2. backfill from current lat / lng
      await queryRunner.query(`
        UPDATE ${table}
        SET geom = ST_SetSRID(ST_MakePoint(lng::float8, lat::float8), 4326)
        WHERE geom IS NULL AND lat IS NOT NULL AND lng IS NOT NULL
      `);

      // 3. GIST index — the whole point of this migration
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_${table}_geom
          ON ${table}
          USING GIST (geom)
      `);

      // 4. keep-in-sync trigger
      await queryRunner.query(
        `DROP TRIGGER IF EXISTS trg_${table}_sync_geom ON ${table}`,
      );
      await queryRunner.query(`
        CREATE TRIGGER trg_${table}_sync_geom
        BEFORE INSERT OR UPDATE OF lat, lng ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION evrs_sync_geom_from_latlng();
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table } of this.tables) {
      await queryRunner.query(
        `DROP TRIGGER IF EXISTS trg_${table}_sync_geom ON ${table}`,
      );
      await queryRunner.query(`DROP INDEX IF EXISTS idx_${table}_geom`);
      await queryRunner.query(
        `ALTER TABLE ${table} DROP COLUMN IF EXISTS geom`,
      );
    }
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS evrs_sync_geom_from_latlng()`,
    );
    // Intentionally NOT dropping the postgis extension — other tools / future
    // migrations may depend on it. Drop it manually if you really need to.
  }
}
