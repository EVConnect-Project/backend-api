import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

export async function fixSchemaOnStartup(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  
  console.log('🔧 Applying schema fixes after TypeORM initialization...');
  
  const queryRunner = dataSource.createQueryRunner();
  
  try {
    await queryRunner.connect();
    
    // Restore columns that TypeORM keeps dropping
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_brand VARCHAR`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS battery_capacity DECIMAL(5,2)`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS connector_type VARCHAR`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT false`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_privacy_policy BOOLEAN DEFAULT false`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);
    
    // Create indexes
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_users ON users(phone) WHERE phone IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_email_users ON users(email) WHERE email IS NOT NULL`);
    
    console.log('✅ Schema fixes applied successfully');
  } catch (error) {
    console.error('❌ Error applying schema fixes:', error.message);
  } finally {
    await queryRunner.release();
  }
}
