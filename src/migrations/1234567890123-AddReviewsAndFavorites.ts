import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewsAndFavorites1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create charger_reviews table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS charger_reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "chargerId" UUID NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        photos TEXT[],
        "helpfulCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "chargerId")
      )
    `);

    // Create indexes for charger_reviews
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_charger_reviews_charger_id ON charger_reviews("chargerId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_charger_reviews_user_id ON charger_reviews("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_charger_reviews_rating ON charger_reviews(rating)
    `);

    // Create favorite_chargers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS favorite_chargers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "chargerId" UUID NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
        "addedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "chargerId")
      )
    `);

    // Create indexes for favorite_chargers
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_favorite_chargers_user_id ON favorite_chargers("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_favorite_chargers_charger_id ON favorite_chargers("chargerId")
    `);

    // Create trigger function for charger_reviews updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_charger_reviews_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_charger_reviews_updated_at ON charger_reviews
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_charger_reviews_updated_at
      BEFORE UPDATE ON charger_reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_charger_reviews_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_charger_reviews_updated_at ON charger_reviews`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_charger_reviews_updated_at()`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_favorite_chargers_charger_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_favorite_chargers_user_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS favorite_chargers`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_charger_reviews_rating`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_charger_reviews_user_id`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_charger_reviews_charger_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS charger_reviews`);
  }
}
