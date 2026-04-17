import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServiceStationPlacementToPromotions1779000000001 implements MigrationInterface {
  name = "AddServiceStationPlacementToPromotions1779000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotions_placement_enum') THEN
          ALTER TYPE promotions_placement_enum ADD VALUE IF NOT EXISTS 'service_station_list';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // Postgres enums cannot easily remove values without a rebuild.
  }
}
