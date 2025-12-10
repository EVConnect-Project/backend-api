import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNumberOfPlugsToCharger1733501000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'chargers',
      new TableColumn({
        name: 'numberOfPlugs',
        type: 'int',
        default: 1,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('chargers', 'numberOfPlugs');
  }
}
