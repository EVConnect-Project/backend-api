import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommissionFieldsToPayments1733424577000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments 
      ADD COLUMN "systemCommission" DECIMAL(10, 2) NULL,
      ADD COLUMN "ownerRevenue" DECIMAL(10, 2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments 
      DROP COLUMN "systemCommission",
      DROP COLUMN "ownerRevenue"
    `);
  }
}
