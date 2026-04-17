import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhoneAndVehicleFields1731897600000 implements MigrationInterface {
  name = "AddPhoneAndVehicleFields1731897600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make email nullable
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`,
    );

    // Add phone column
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR`,
    );

    // Add vehicle-related columns
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vehicle_type" VARCHAR`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vehicle_brand" VARCHAR`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vehicle_model" VARCHAR`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "battery_capacity" DECIMAL(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "connector_type" VARCHAR`,
    );

    // Add legal/terms columns
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accepted_terms" BOOLEAN DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accepted_privacy_policy" BOOLEAN DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP`,
    );

    // Create unique partial index for phone (only when not null)
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_phone_users" ON "users"("phone") WHERE "phone" IS NOT NULL`,
    );

    // Create unique partial index for email (only when not null)
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_email_users" ON "users"("email") WHERE "email" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_phone_users"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_email_users"`);

    // Drop columns
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_accepted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "accepted_privacy_policy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "accepted_terms"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "connector_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "battery_capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "vehicle_model"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "vehicle_brand"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "vehicle_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`,
    );

    // Make email not null again
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`,
    );
  }
}
