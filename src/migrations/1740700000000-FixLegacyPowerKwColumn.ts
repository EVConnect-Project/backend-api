import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLegacyPowerKwColumn1740700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The chargers table had a legacy "powerKw" column (NOT NULL) alongside the
    // canonical "max_power_kw" column. The entity only maps to "max_power_kw",
    // so inserts were failing with a NOT NULL constraint on "powerKw".
    // Fix: make powerKw nullable with a default of 0 and sync existing rows.

    await queryRunner.query(
      `ALTER TABLE chargers ALTER COLUMN "powerKw" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE chargers ALTER COLUMN "powerKw" SET DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE chargers SET "powerKw" = max_power_kw WHERE "powerKw" IS NULL OR "powerKw" = 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore previous state (powerKw NOT NULL)
    await queryRunner.query(
      `UPDATE chargers SET "powerKw" = max_power_kw`,
    );
    await queryRunner.query(
      `ALTER TABLE chargers ALTER COLUMN "powerKw" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE chargers ALTER COLUMN "powerKw" DROP DEFAULT`,
    );
  }
}
