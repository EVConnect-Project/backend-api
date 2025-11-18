import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingUserColumns1731880000000 implements MigrationInterface {
    name = 'AddMissingUserColumns1731880000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add missing columns to users table
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN IF NOT EXISTS "phone" character varying,
            ADD COLUMN IF NOT EXISTS "vehicle_type" character varying,
            ADD COLUMN IF NOT EXISTS "vehicle_brand" character varying,
            ADD COLUMN IF NOT EXISTS "vehicle_model" character varying,
            ADD COLUMN IF NOT EXISTS "battery_capacity" numeric(5,2),
            ADD COLUMN IF NOT EXISTS "connector_type" character varying,
            ADD COLUMN IF NOT EXISTS "accepted_terms" boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS "accepted_privacy_policy" boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove added columns
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN IF EXISTS "phone",
            DROP COLUMN IF EXISTS "vehicle_type",
            DROP COLUMN IF EXISTS "vehicle_brand",
            DROP COLUMN IF EXISTS "vehicle_model",
            DROP COLUMN IF EXISTS "battery_capacity",
            DROP COLUMN IF EXISTS "connector_type",
            DROP COLUMN IF EXISTS "accepted_terms",
            DROP COLUMN IF EXISTS "accepted_privacy_policy",
            DROP COLUMN IF EXISTS "terms_accepted_at"
        `);
    }
}
