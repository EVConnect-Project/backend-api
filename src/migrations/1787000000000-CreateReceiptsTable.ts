import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Receipts: one row per `succeeded` payment, plus refund metadata.
 *
 * Why a separate table instead of reusing the `payments` row?
 *   - Receipts have to keep their own immutable line-items snapshot at the
 *     time of issue (charger price + commission split + tax) which is wrong
 *     to mutate when, say, a charger's pricePerKwh changes later.
 *   - Refund flow updates a single column here without touching the original
 *     `payments` ledger row's amount.
 */
export class CreateReceiptsTable1787000000000 implements MigrationInterface {
  name = "CreateReceiptsTable1787000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "receiptNumber" VARCHAR(32) NOT NULL,
        "userId" UUID NOT NULL,
        "paymentId" UUID NOT NULL,
        "bookingId" UUID,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'LKR',
        "lineItems" JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(16) NOT NULL DEFAULT 'issued',
        provider VARCHAR(50),
        "providerReference" VARCHAR(255),
        "refundedAt" TIMESTAMP,
        "refundAmount" DECIMAL(10, 2),
        "issuedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_receipts_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_receipts_payment FOREIGN KEY ("paymentId") REFERENCES payments(id) ON DELETE CASCADE,
        CONSTRAINT fk_receipts_booking FOREIGN KEY ("bookingId") REFERENCES bookings(id) ON DELETE SET NULL,
        CONSTRAINT chk_receipts_status CHECK (status IN ('issued', 'refunded', 'void'))
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_number
        ON receipts ("receiptNumber")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_receipts_user
        ON receipts ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_receipts_payment
        ON receipts ("paymentId")
    `);

    // One receipt per successful payment. The application enforces this too
    // (idempotent upsert in ReceiptsService), but a DB-level constraint
    // catches any future code path that bypasses the service.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_receipts_one_per_payment
        ON receipts ("paymentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_receipts_one_per_payment`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_receipts_payment`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_receipts_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_receipts_number`);
    await queryRunner.query(`DROP TABLE IF EXISTS receipts`);
  }
}
