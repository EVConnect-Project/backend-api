import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImagesToCharger1772661000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add images column to chargers table if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE "chargers"
      ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the images column
    await queryRunner.query(`
      ALTER TABLE "chargers"
      DROP COLUMN IF EXISTS "images"
    `);
  }
}
