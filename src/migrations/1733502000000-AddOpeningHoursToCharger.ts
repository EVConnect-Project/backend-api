import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOpeningHoursToCharger1733502000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'chargers',
      new TableColumn({
        name: 'openingHours',
        type: 'jsonb',
        isNullable: true,
        default: `'{"is24Hours": true, "schedule": {}}'`,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('chargers', 'openingHours');
  }
}