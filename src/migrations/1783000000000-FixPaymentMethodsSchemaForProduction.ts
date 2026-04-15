import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPaymentMethodsSchemaForProduction1783000000000
  implements MigrationInterface
{
  name = 'FixPaymentMethodsSchemaForProduction1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'card',
        "stripePaymentMethodId" VARCHAR,
        brand VARCHAR,
        "cardBrand" VARCHAR(50),
        "lastFour" VARCHAR(4),
        "expiryMonth" VARCHAR(2),
        "expiryYear" VARCHAR(2),
        "cardholderName" VARCHAR(255),
        token VARCHAR(255),
        "isDefault" BOOLEAN DEFAULT false,
        "billingAddress" JSONB,
        metadata JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_payment_method_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_payment_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID UNIQUE NOT NULL,
        "autoPayEnabled" BOOLEAN DEFAULT false,
        "saveReceipts" BOOLEAN DEFAULT true,
        "emailNotifications" BOOLEAN DEFAULT true,
        "smsNotifications" BOOLEAN DEFAULT true,
        currency VARCHAR(10) DEFAULT 'LKR',
        "dailySpendingLimit" DECIMAL(10, 2),
        "monthlySpendingLimit" DECIMAL(10, 2),
        "requirePinForPayments" BOOLEAN DEFAULT false,
        "paymentPinHash" VARCHAR(255),
        "transactionAlerts" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_payment_settings_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "stripePaymentMethodId" VARCHAR`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS brand VARCHAR`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "cardBrand" VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "lastFour" VARCHAR(4)`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "expiryMonth" VARCHAR(2)`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "expiryYear" VARCHAR(2)`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "cardholderName" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS token VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "billingAddress" JSONB`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS metadata JSONB`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'payment_methods'
            AND column_name = 'metadata'
            AND data_type = 'text'
        ) THEN
          ALTER TABLE payment_methods
          ALTER COLUMN metadata TYPE JSONB
          USING CASE
            WHEN metadata IS NULL OR btrim(metadata) = '' THEN NULL
            WHEN left(btrim(metadata), 1) IN ('{', '[') THEN metadata::jsonb
            ELSE to_jsonb(metadata)
          END;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      UPDATE payment_methods
      SET "cardBrand" = COALESCE("cardBrand", brand)
      WHERE "cardBrand" IS NULL AND brand IS NOT NULL
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods("isDefault") WHERE "isDefault" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_payment_settings_user_id ON user_payment_settings("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_payment_settings_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_methods_is_default`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_methods_user_id`);

    await queryRunner.query(`ALTER TABLE payment_methods DROP COLUMN IF EXISTS "stripePaymentMethodId"`);
    await queryRunner.query(`ALTER TABLE payment_methods DROP COLUMN IF EXISTS brand`);
    await queryRunner.query(`ALTER TABLE payment_methods DROP COLUMN IF EXISTS "billingAddress"`);
  }
}
