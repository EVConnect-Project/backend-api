import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOwnerPayoutTables1785000000000 implements MigrationInterface {
  name = "AddOwnerPayoutTables1785000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS owner_payouts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ownerId" UUID NOT NULL,
        "periodStart" TIMESTAMP NOT NULL,
        "periodEnd" TIMESTAMP NOT NULL,
        "grossOwnerRevenue" DECIMAL(10, 2) NOT NULL DEFAULT 0,
        adjustments DECIMAL(10, 2) NOT NULL DEFAULT 0,
        "netPayoutAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        "transferReference" VARCHAR(255),
        "createdByAdminId" UUID,
        "approvedByAdminId" UUID,
        "approvedAt" TIMESTAMP,
        "paidAt" TIMESTAMP,
        notes TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_owner_payouts_owner FOREIGN KEY ("ownerId") REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_owner_payouts_created_admin FOREIGN KEY ("createdByAdminId") REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_owner_payouts_approved_admin FOREIGN KEY ("approvedByAdminId") REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT chk_owner_payouts_status CHECK (status IN ('draft', 'approved', 'processing', 'paid', 'failed', 'cancelled'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS owner_payout_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "payoutId" UUID NOT NULL,
        "paymentId" UUID NOT NULL,
        "bookingId" UUID NOT NULL,
        "ownerRevenueAtPaymentTime" DECIMAL(10, 2) NOT NULL,
        "includeAmount" DECIMAL(10, 2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_owner_payout_items_payout FOREIGN KEY ("payoutId") REFERENCES owner_payouts(id) ON DELETE CASCADE,
        CONSTRAINT fk_owner_payout_items_payment FOREIGN KEY ("paymentId") REFERENCES payments(id) ON DELETE RESTRICT,
        CONSTRAINT fk_owner_payout_items_booking FOREIGN KEY ("bookingId") REFERENCES bookings(id) ON DELETE RESTRICT,
        CONSTRAINT uq_owner_payout_items_payment UNIQUE ("paymentId")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS "payoutStatus" VARCHAR(20) NOT NULL DEFAULT 'unsettled'`,
    );
    await queryRunner.query(
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS "payoutId" UUID`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_payments_payout'
        ) THEN
          ALTER TABLE payments
            ADD CONSTRAINT fk_payments_payout FOREIGN KEY ("payoutId") REFERENCES owner_payouts(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_payments_payout_status'
        ) THEN
          ALTER TABLE payments
            ADD CONSTRAINT chk_payments_payout_status CHECK ("payoutStatus" IN ('unsettled', 'queued', 'settled'));
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_owner_payouts_owner_id ON owner_payouts("ownerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_owner_payouts_status ON owner_payouts(status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_owner_payout_items_payout_id ON owner_payout_items("payoutId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_owner_payout_items_payment_id ON owner_payout_items("paymentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payments_payout_status ON payments("payoutStatus")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payments_payout_id ON payments("payoutId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_payout_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_payout_status`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_owner_payout_items_payment_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_owner_payout_items_payout_id`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_owner_payouts_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_owner_payouts_owner_id`);

    await queryRunner.query(
      `ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_payout_status`,
    );
    await queryRunner.query(
      `ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_payout`,
    );
    await queryRunner.query(
      `ALTER TABLE payments DROP COLUMN IF EXISTS "payoutId"`,
    );
    await queryRunner.query(
      `ALTER TABLE payments DROP COLUMN IF EXISTS "payoutStatus"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS owner_payout_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS owner_payouts`);
  }
}
