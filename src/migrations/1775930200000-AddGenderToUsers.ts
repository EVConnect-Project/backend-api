import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGenderToUsers1775930200000 implements MigrationInterface {
  name = "AddGenderToUsers1775930200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" VARCHAR`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "gender"`,
    );
  }
}
