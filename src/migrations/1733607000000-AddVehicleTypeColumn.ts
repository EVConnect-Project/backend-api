import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVehicleTypeColumn1733607000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vehicle_profiles',
      new TableColumn({
        name: 'vehicleType',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vehicle_profiles', 'vehicleType');
  }
}
