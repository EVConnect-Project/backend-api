import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMechanicLeadType1774802686708 implements MigrationInterface {
  name = 'AddMechanicLeadType1774802686708';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leads_type_enum') THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'leads_type_enum' AND e.enumlabel = 'MECHANIC'
          ) THEN
            ALTER TYPE leads_type_enum ADD VALUE 'MECHANIC';
          END IF;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL enum values cannot be removed safely in-place.
  }
}
