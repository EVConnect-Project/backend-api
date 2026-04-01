import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNumberOfPlugsToCharger1733501000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const chargersTable = await queryRunner.getTable('chargers');
    const hasColumn = chargersTable?.findColumnByName('numberOfPlugs');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'chargers',
        new TableColumn({
          name: 'numberOfPlugs',
          type: 'int',
          default: 1,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const chargersTable = await queryRunner.getTable('chargers');
    const hasColumn = chargersTable?.findColumnByName('numberOfPlugs');
    if (hasColumn) {
      await queryRunner.dropColumn('chargers', 'numberOfPlugs');
    }
  }
}
