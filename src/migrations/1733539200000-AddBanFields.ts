import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBanFields1733539200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isBanned to chargers
    await queryRunner.addColumn(
      'chargers',
      new TableColumn({
        name: 'isBanned',
        type: 'boolean',
        default: false,
      }),
    );

    // Add isBanned to mechanics
    await queryRunner.addColumn(
      'mechanics',
      new TableColumn({
        name: 'isBanned',
        type: 'boolean',
        default: false,
      }),
    );

    // Add isBanned to marketplace_listings
    await queryRunner.addColumn(
      'marketplace_listings',
      new TableColumn({
        name: 'isBanned',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('chargers', 'isBanned');
    await queryRunner.dropColumn('mechanics', 'isBanned');
    await queryRunner.dropColumn('marketplace_listings', 'isBanned');
  }
}
