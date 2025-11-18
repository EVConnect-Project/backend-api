import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChargerModule } from './charger/charger.module';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { MechanicsModule } from './mechanics/mechanics.module';
import { AdminModule } from './admin/admin.module';
import { OwnerModule } from './owner/owner.module';
import { MechanicModule } from './mechanic/mechanic.module';
import { BreakdownModule } from './breakdown/breakdown.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MarketplaceChatModule } from './marketplace-chat/marketplace-chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 60 seconds
      limit: 30,   // 30 requests per minute globally
    }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        synchronize: false,  // CRITICAL: Must be false to prevent schema destruction
        migrationsRun: false,
        autoLoadEntities: true,  // Allow auto-loading but don't sync
        logging: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CloudinaryModule,
    ChargerModule,
    UsersModule,
    BookingsModule,
    PaymentsModule,
    MechanicsModule,
    AdminModule,
    OwnerModule,
    MechanicModule,
    BreakdownModule,
    MarketplaceModule,
    MarketplaceChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    console.log('🔧 Fixing schema after TypeORM initialization...');
    
    const queryRunner = this.dataSource.createQueryRunner();
    
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
}

