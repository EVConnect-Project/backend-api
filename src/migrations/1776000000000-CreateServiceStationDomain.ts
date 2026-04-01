import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceStationDomain1776000000000
  implements MigrationInterface
{
  name = 'CreateServiceStationDomain1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS service_provider_signals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id UUID NOT NULL,
        provider_type VARCHAR(32) NOT NULL,
        mode VARCHAR(16) NOT NULL,
        issue_type VARCHAR(80),
        action VARCHAR(40) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_service_provider_signals_user_created ON service_provider_signals(user_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_service_provider_signals_mode_issue ON service_provider_signals(mode, issue_type)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS service_station_applications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        station_name VARCHAR(255) NOT NULL,
        location_url TEXT NOT NULL,
        lat DECIMAL(10, 7) NOT NULL,
        lng DECIMAL(10, 7) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(120),
        phone_number VARCHAR(24),
        description TEXT,
        service_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
        amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
        opening_hours JSONB DEFAULT '{"is24Hours": true, "schedule": {}}'::jsonb,
        application_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        review_notes TEXT,
        reviewed_by UUID,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_service_station_applications_user ON service_station_applications(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_service_station_applications_status ON service_station_applications(application_status)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS service_stations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        application_id UUID UNIQUE,
        station_name VARCHAR(255) NOT NULL,
        location_url TEXT NOT NULL,
        lat DECIMAL(10, 7) NOT NULL,
        lng DECIMAL(10, 7) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(120),
        phone_number VARCHAR(24),
        description TEXT,
        service_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
        amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
        opening_hours JSONB DEFAULT '{"is24Hours": true, "schedule": {}}'::jsonb,
        images JSONB NOT NULL DEFAULT '[]'::jsonb,
        verified BOOLEAN NOT NULL DEFAULT true,
        is_banned BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_service_stations_owner ON service_stations(owner_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_service_stations_verified ON service_stations(verified, is_banned)`,
    );

    // Backfill legacy service_station records that were stored in charging_stations.
    await queryRunner.query(`
      INSERT INTO service_station_applications (
        id, user_id, station_name, location_url, lat, lng, address, city,
        description, service_categories, amenities, opening_hours,
        application_status, review_notes, reviewed_by, reviewed_at,
        created_at, updated_at
      )
      SELECT
        cs.id,
        cs.owner_id,
        cs.station_name,
        cs.location_url,
        cs.lat,
        cs.lng,
        cs.address,
        cs.city,
        cs.description,
        COALESCE(cs.amenities, '[]'::jsonb),
        COALESCE(cs.amenities, '[]'::jsonb),
        COALESCE(cs.opening_hours, '{"is24Hours": true, "schedule": {}}'::jsonb),
        CASE
          WHEN cs.verified = true THEN 'approved'
          ELSE 'pending'
        END,
        NULL,
        NULL,
        NULL,
        cs.created_at,
        cs.updated_at
      FROM charging_stations cs
      WHERE cs.station_type = 'service_station'
      ON CONFLICT (id) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO service_stations (
        owner_id, application_id, station_name, location_url, lat, lng,
        address, city, description, service_categories, amenities,
        opening_hours, images, verified, is_banned, created_at, updated_at
      )
      SELECT
        ssa.user_id,
        ssa.id,
        ssa.station_name,
        ssa.location_url,
        ssa.lat,
        ssa.lng,
        ssa.address,
        ssa.city,
        ssa.description,
        COALESCE(ssa.service_categories, '[]'::jsonb),
        COALESCE(ssa.amenities, '[]'::jsonb),
        COALESCE(ssa.opening_hours, '{"is24Hours": true, "schedule": {}}'::jsonb),
        '[]'::jsonb,
        true,
        false,
        ssa.created_at,
        ssa.updated_at
      FROM service_station_applications ssa
      WHERE ssa.application_status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM service_stations ss WHERE ss.application_id = ssa.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_stations_verified`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_stations_owner`);
    await queryRunner.query(`DROP TABLE IF EXISTS service_stations`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_station_applications_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_station_applications_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS service_station_applications`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_service_provider_signals_mode_issue`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_service_provider_signals_user_created`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS service_provider_signals`);
  }
}
