import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEmergencyTables1733596000000 implements MigrationInterface {
    name = 'CreateEmergencyTables1733596000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create emergency_requests table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "emergency_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "latitude" numeric(10,7) NOT NULL,
                "longitude" numeric(10,7) NOT NULL,
                "problemDescription" text,
                "vehicleDetails" jsonb,
                "urgencyLevel" character varying(20) NOT NULL DEFAULT 'medium',
                "status" character varying(20) NOT NULL DEFAULT 'pending',
                "selectedMechanicId" uuid,
                "alertedMechanicIds" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "completedAt" TIMESTAMP,
                "cancelledAt" TIMESTAMP,
                CONSTRAINT "PK_emergency_requests" PRIMARY KEY ("id")
            )
        `);

        // Create mechanic_responses table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "mechanic_responses" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "emergencyRequestId" uuid NOT NULL,
                "mechanicId" uuid NOT NULL,
                "responseType" character varying(20) NOT NULL,
                "status" character varying(20),
                "etaMinutes" integer,
                "notes" text,
                "currentLatitude" numeric(10,7),
                "currentLongitude" numeric(10,7),
                "respondedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "statusUpdatedAt" TIMESTAMP,
                CONSTRAINT "PK_mechanic_responses" PRIMARY KEY ("id")
            )
        `);

        // Add foreign keys
                await queryRunner.query(`
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint WHERE conname = 'FK_emergency_requests_user'
                            ) AND EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'emergency_requests' AND column_name = 'userId'
                            ) THEN
                                ALTER TABLE "emergency_requests"
                                ADD CONSTRAINT "FK_emergency_requests_user"
                                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
                            END IF;
                        END $$;
                `);

                await queryRunner.query(`
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint WHERE conname = 'FK_emergency_requests_mechanic'
                            ) AND EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'emergency_requests' AND column_name = 'selectedMechanicId'
                            ) THEN
                                ALTER TABLE "emergency_requests"
                                ADD CONSTRAINT "FK_emergency_requests_mechanic"
                                FOREIGN KEY ("selectedMechanicId") REFERENCES "mechanics"("id") ON DELETE SET NULL;
                            END IF;
                        END $$;
                `);

                await queryRunner.query(`
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint WHERE conname = 'FK_mechanic_responses_emergency'
                            ) AND EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'mechanic_responses' AND column_name = 'emergencyRequestId'
                            ) THEN
                                ALTER TABLE "mechanic_responses"
                                ADD CONSTRAINT "FK_mechanic_responses_emergency"
                                FOREIGN KEY ("emergencyRequestId") REFERENCES "emergency_requests"("id") ON DELETE CASCADE;
                            END IF;
                        END $$;
                `);

                await queryRunner.query(`
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint WHERE conname = 'FK_mechanic_responses_mechanic'
                            ) AND EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'mechanic_responses' AND column_name = 'mechanicId'
                            ) THEN
                                ALTER TABLE "mechanic_responses"
                                ADD CONSTRAINT "FK_mechanic_responses_mechanic"
                                FOREIGN KEY ("mechanicId") REFERENCES "mechanics"("id") ON DELETE CASCADE;
                            END IF;
                        END $$;
                `);

        // Create indexes for better query performance
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_emergency_requests_userId" ON "emergency_requests" ("userId")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_emergency_requests_status" ON "emergency_requests" ("status")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_mechanic_responses_emergencyRequestId" ON "mechanic_responses" ("emergencyRequestId")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_mechanic_responses_mechanicId" ON "mechanic_responses" ("mechanicId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mechanic_responses_mechanicId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mechanic_responses_emergencyRequestId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_emergency_requests_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_emergency_requests_userId"`);

        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "mechanic_responses" DROP CONSTRAINT IF EXISTS "FK_mechanic_responses_mechanic"`);
        await queryRunner.query(`ALTER TABLE "mechanic_responses" DROP CONSTRAINT IF EXISTS "FK_mechanic_responses_emergency"`);
        await queryRunner.query(`ALTER TABLE "emergency_requests" DROP CONSTRAINT IF EXISTS "FK_emergency_requests_mechanic"`);
        await queryRunner.query(`ALTER TABLE "emergency_requests" DROP CONSTRAINT IF EXISTS "FK_emergency_requests_user"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE IF EXISTS "mechanic_responses"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "emergency_requests"`);
    }
}
