import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLegacyPowerKwColumn1740700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The chargers table had a legacy "powerKw" column (NOT NULL) alongside the
    // canonical "max_power_kw" column. The entity only maps to "max_power_kw",
    // so inserts were failing with a NOT NULL constraint on "powerKw".
    // Fix: make powerKw nullable with a default of 0 and sync existing rows.

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'chargers' AND column_name = 'powerKw'
        ) THEN
          ALTER TABLE chargers ALTER COLUMN "powerKw" DROP NOT NULL;
          ALTER TABLE chargers ALTER COLUMN "powerKw" SET DEFAULT 0;
          UPDATE chargers
          SET "powerKw" = max_power_kw
          WHERE "powerKw" IS NULL OR "powerKw" = 0;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore previous state (powerKw NOT NULL)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'chargers' AND column_name = 'powerKw'
        ) THEN
          UPDATE chargers SET "powerKw" = max_power_kw;
          ALTER TABLE chargers ALTER COLUMN "powerKw" SET NOT NULL;
          ALTER TABLE chargers ALTER COLUMN "powerKw" DROP DEFAULT;
        END IF;
      END $$;
    `);
  }
}
