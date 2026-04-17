import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddOpeningHoursToCharger1733502000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const chargersTable = await queryRunner.getTable("chargers");
    const hasColumn = chargersTable?.findColumnByName("openingHours");
    if (!hasColumn) {
      await queryRunner.addColumn(
        "chargers",
        new TableColumn({
          name: "openingHours",
          type: "jsonb",
          isNullable: true,
          default: `'{"is24Hours": true, "schedule": {}}'`,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const chargersTable = await queryRunner.getTable("chargers");
    const hasColumn = chargersTable?.findColumnByName("openingHours");
    if (hasColumn) {
      await queryRunner.dropColumn("chargers", "openingHours");
    }
  }
}
