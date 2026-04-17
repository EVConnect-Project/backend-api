import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddVehicleTypeColumn1733607000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const vehicleProfilesTable = await queryRunner.getTable("vehicle_profiles");
    const hasColumn = vehicleProfilesTable?.findColumnByName("vehicleType");
    if (!hasColumn) {
      await queryRunner.addColumn(
        "vehicle_profiles",
        new TableColumn({
          name: "vehicleType",
          type: "varchar",
          length: "50",
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const vehicleProfilesTable = await queryRunner.getTable("vehicle_profiles");
    const hasColumn = vehicleProfilesTable?.findColumnByName("vehicleType");
    if (hasColumn) {
      await queryRunner.dropColumn("vehicle_profiles", "vehicleType");
    }
  }
}
