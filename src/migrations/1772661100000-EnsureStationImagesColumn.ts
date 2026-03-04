import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureStationImagesColumn1772661100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verify images column exists in charging_stations
    await queryRunner.query(`
      ALTER TABLE "charging_stations"
      ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Migration is safe to leave as is
  }
}
