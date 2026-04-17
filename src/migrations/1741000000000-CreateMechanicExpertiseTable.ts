import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMechanicExpertiseTable1741000000000 implements MigrationInterface {
  name = "CreateMechanicExpertiseTable1741000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create mechanic_expertise table to track problem-type specific expertise
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "mechanic_expertise" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "mechanicId" uuid NOT NULL,
                "problemType" character varying(50) NOT NULL,
                "jobsCompleted" integer NOT NULL DEFAULT 0,
                "jobsSuccessful" integer NOT NULL DEFAULT 0,
                "avgResolutionMinutes" integer,
                "avgSatisfactionRating" numeric(3,2),
                "lastJobAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_mechanic_expertise" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_mechanic_expertise_mechanic_problem" UNIQUE ("mechanicId", "problemType")
            )
        `);

    // Add foreign key to mechanics table
    await queryRunner.query(`
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint WHERE conname = 'FK_mechanic_expertise_mechanic'
                            ) THEN
                                ALTER TABLE "mechanic_expertise"
                                ADD CONSTRAINT "FK_mechanic_expertise_mechanic"
                                FOREIGN KEY ("mechanicId") REFERENCES "mechanics"("id") ON DELETE CASCADE;
                            END IF;
                        END $$;
                `);

    // Create indexes for better query performance
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_mechanic_expertise_mechanicId" ON "mechanic_expertise" ("mechanicId")
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_mechanic_expertise_problemType" ON "mechanic_expertise" ("problemType")
        `);

    // Add problem-type tracking columns to emergency_requests table
    await queryRunner.query(`
            ALTER TABLE "emergency_requests"
            ADD COLUMN IF NOT EXISTS "problemType" character varying(50)
        `);

    await queryRunner.query(`
            ALTER TABLE "emergency_requests"
            ADD COLUMN IF NOT EXISTS "resolutionTimeMinutes" integer
        `);

    await queryRunner.query(`
            ALTER TABLE "emergency_requests"
            ADD COLUMN IF NOT EXISTS "userSatisfactionRating" numeric(3,2)
        `);

    await queryRunner.query(`
            ALTER TABLE "emergency_requests"
            ADD COLUMN IF NOT EXISTS "mechanicFeedback" text
        `);

    // Create index on problemType for analytics queries
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_emergency_requests_problemType" ON "emergency_requests" ("problemType")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes from emergency_requests
    await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_emergency_requests_problemType"
        `);

    // Remove columns from emergency_requests
    await queryRunner.query(`
            ALTER TABLE "emergency_requests"
            DROP COLUMN IF EXISTS "mechanicFeedback"
        `);

    await queryRunner.query(`
            ALTER TABLE "emergency_requests"
            DROP COLUMN IF EXISTS "userSatisfactionRating"
        `);

    await queryRunner.query(`
            ALTER TABLE "emergency_requests"
            DROP COLUMN IF EXISTS "resolutionTimeMinutes"
        `);

    await queryRunner.query(`
            ALTER TABLE "emergency_requests"
            DROP COLUMN IF EXISTS "problemType"
        `);

    // Drop mechanic_expertise table
    await queryRunner.query(`
            DROP TABLE IF EXISTS "mechanic_expertise"
        `);
  }
}
