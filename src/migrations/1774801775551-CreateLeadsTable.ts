import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeadsTable1774801775551 implements MigrationInterface {
  name = 'CreateLeadsTable1774801775551';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leads_type_enum') THEN
          CREATE TYPE leads_type_enum AS ENUM ('CONTACT', 'PARTNER');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leads_status_enum') THEN
          CREATE TYPE leads_status_enum AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type leads_type_enum NOT NULL DEFAULT 'CONTACT',
        first_name VARCHAR,
        last_name VARCHAR,
        email VARCHAR,
        phone VARCHAR,
        subject VARCHAR,
        message TEXT,
        company_name VARCHAR,
        contact_name VARCHAR,
        location_count VARCHAR,
        status leads_status_enum NOT NULL DEFAULT 'NEW',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_status`);
    await queryRunner.query(`DROP TABLE IF EXISTS leads`);
    await queryRunner.query(`DROP TYPE IF EXISTS leads_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS leads_type_enum`);
  }
}
