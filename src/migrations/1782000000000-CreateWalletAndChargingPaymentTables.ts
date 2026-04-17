import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWalletAndChargingPaymentTables1782000000000 implements MigrationInterface {
  name = "CreateWalletAndChargingPaymentTables1782000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_transactions_type_enum') THEN
          CREATE TYPE wallet_transactions_type_enum AS ENUM ('TOPUP', 'PAYMENT', 'REFUND');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_transactions_status_enum') THEN
          CREATE TYPE wallet_transactions_status_enum AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_charging_sessions_status_enum') THEN
          CREATE TYPE wallet_charging_sessions_status_enum AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID UNIQUE NOT NULL,
        balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
        "heldBalance" DECIMAL(12, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
        "autoTopupEnabled" BOOLEAN NOT NULL DEFAULT false,
        "autoTopupThreshold" DECIMAL(12, 2),
        "autoTopupAmount" DECIMAL(12, 2),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_wallets_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT chk_wallet_balance_non_negative CHECK (balance >= 0),
        CONSTRAINT chk_wallet_held_balance_non_negative CHECK ("heldBalance" >= 0),
        CONSTRAINT chk_wallet_currency CHECK (currency = 'LKR')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        "transactionId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        type wallet_transactions_type_enum NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        status wallet_transactions_status_enum NOT NULL DEFAULT 'PENDING',
        "referenceId" VARCHAR(255) UNIQUE,
        metadata JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_wallet_transactions_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT chk_wallet_transactions_amount_positive CHECK (amount >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wallet_charging_sessions (
        "sessionId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        "chargerId" VARCHAR(120) NOT NULL,
        "externalSessionId" VARCHAR(120),
        "startTime" TIMESTAMP NOT NULL,
        "endTime" TIMESTAMP,
        "unitsConsumed" DECIMAL(12, 4) NOT NULL DEFAULT 0,
        "pricePerKwh" DECIMAL(12, 2) NOT NULL,
        "totalCost" DECIMAL(12, 2) NOT NULL DEFAULT 0,
        "heldAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
        status wallet_charging_sessions_status_enum NOT NULL DEFAULT 'ACTIVE',
        metadata JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_wallet_charging_sessions_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT chk_wallet_charging_units_non_negative CHECK ("unitsConsumed" >= 0),
        CONSTRAINT chk_wallet_charging_total_cost_non_negative CHECK ("totalCost" >= 0)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_wallet_charging_sessions_user_id ON wallet_charging_sessions("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_wallet_charging_sessions_status ON wallet_charging_sessions(status)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_charging_sessions_user_active ON wallet_charging_sessions("userId") WHERE status = 'ACTIVE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_wallet_charging_sessions_user_active`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_wallet_charging_sessions_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_wallet_charging_sessions_user_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_wallet_transactions_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_wallet_transactions_type`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_wallet_transactions_user_id`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_wallets_user_id`);

    await queryRunner.query(`DROP TABLE IF EXISTS wallet_charging_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS wallet_transactions`);
    await queryRunner.query(`DROP TABLE IF EXISTS wallets`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS wallet_charging_sessions_status_enum`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS wallet_transactions_status_enum`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS wallet_transactions_type_enum`,
    );
  }
}
