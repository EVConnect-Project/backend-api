import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImagesToServiceStationApplications1776200000000 implements MigrationInterface {
  name = "AddImagesToServiceStationApplications1776200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE service_station_applications
      ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb
    `);

    // Backfill from legacy charging_stations records if matching IDs exist.
    await queryRunner.query(`
      UPDATE service_station_applications ssa
      SET images = COALESCE(cs.images, '[]'::jsonb)
      FROM charging_stations cs
      WHERE cs.station_type = 'service_station'
        AND cs.id = ssa.id
        AND (
          ssa.images IS NULL
          OR jsonb_typeof(ssa.images) <> 'array'
          OR jsonb_array_length(ssa.images) = 0
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE service_station_applications
      DROP COLUMN IF EXISTS images
    `);
  }
}
