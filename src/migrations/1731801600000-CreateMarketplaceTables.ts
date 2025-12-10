import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarketplaceTables1731801600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create marketplace_listings table
    await queryRunner.query(`
      CREATE TABLE marketplace_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        condition VARCHAR NOT NULL CHECK (condition IN ('new', 'used')),
        city VARCHAR,
        lat FLOAT,
        long FLOAT,
        "sellerId" UUID NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold')),
        "adminNotes" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_marketplace_listings_seller" FOREIGN KEY ("sellerId") REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create marketplace_images table
    await queryRunner.query(`
      CREATE TABLE marketplace_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "imageUrl" VARCHAR NOT NULL,
        "listingId" UUID NOT NULL,
        CONSTRAINT "FK_marketplace_images_listing" FOREIGN KEY ("listingId") REFERENCES marketplace_listings(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_marketplace_listings_seller" ON marketplace_listings ("sellerId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketplace_listings_status" ON marketplace_listings (status)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketplace_listings_category" ON marketplace_listings (category)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketplace_images_listing" ON marketplace_images ("listingId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_marketplace_images_listing"`);
    await queryRunner.query(`DROP INDEX "IDX_marketplace_listings_category"`);
    await queryRunner.query(`DROP INDEX "IDX_marketplace_listings_status"`);
    await queryRunner.query(`DROP INDEX "IDX_marketplace_listings_seller"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE marketplace_images`);
    await queryRunner.query(`DROP TABLE marketplace_listings`);
  }
}
