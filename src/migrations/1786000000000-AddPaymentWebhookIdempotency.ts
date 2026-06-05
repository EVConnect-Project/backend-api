import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tier-0 fix: payment webhook idempotency.
 *
 * - Adds a dedicated table that records every successfully processed gateway
 *   webhook keyed by (provider, externalReference). PayHere's `payment_id` is
 *   one such external reference; a duplicate insert raises a unique-constraint
 *   violation which the service uses to short-circuit replays.
 * - Adds (provider, txnId) uniqueness on `payments` so the same gateway
 *   transaction cannot be applied to two payment rows.
 */
export class AddPaymentWebhookIdempotency1786000000000
  implements MigrationInterface
{
  name = "AddPaymentWebhookIdempotency1786000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS processed_payment_webhooks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider VARCHAR(50) NOT NULL,
        "externalReference" VARCHAR(255) NOT NULL,
        "paymentId" UUID,
        "statusCode" VARCHAR(20),
        "receivedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_processed_payment_webhooks_provider_ref
          UNIQUE (provider, "externalReference")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_processed_payment_webhooks_payment
        ON processed_payment_webhooks ("paymentId")
    `);

    // Partial unique index: enforce one txn per provider when txnId is present.
    // Partial (WHERE) form is required so the many historic NULLs don't collide.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_txnid
        ON payments (provider, "txnId")
        WHERE "txnId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_payments_provider_txnid`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_processed_payment_webhooks_payment`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS processed_payment_webhooks`);
  }
}
