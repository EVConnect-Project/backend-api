import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillBookingColumns1779000000002 implements MigrationInterface {
  name = 'BackfillBookingColumns1779000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "bookingType" character varying(20) DEFAULT 'PRE_BOOKING'`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "checkInTime" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "gracePeriodExpiresAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "autoCheckInEnabled" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "noShow" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "notes" TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "notes"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "noShow"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "autoCheckInEnabled"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "gracePeriodExpiresAt"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checkInTime"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "bookingType"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancelReason"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancelledAt"`);
  }
}
