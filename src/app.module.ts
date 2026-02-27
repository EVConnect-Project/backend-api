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
import { ChatModule } from './chat/chat.module';
import { ChargingModule } from './charging/charging.module';
import { ChargerIntegrationModule } from './charger-integration/charger-integration.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FavoritesModule } from './favorites/favorites.module';
import { TripPlannerModule } from './trip-planner/trip-planner.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TripModule } from './trip/trip.module';
import { SupportModule } from './support/support.module';
import { EmergencyModule } from './emergency/emergency.module';
import { FeedbackModule } from './feedback/feedback.module';
import { PromotionsModule } from './promotions/promotions.module';
import { StationModule } from './station/station.module';

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
    ChatModule,
    ChargingModule,
    ChargerIntegrationModule,
    ReviewsModule,
    FavoritesModule,
    TripPlannerModule,
    NotificationsModule,
    TripModule,
    SupportModule,
    EmergencyModule,
    FeedbackModule,
    PromotionsModule,
    StationModule,
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
      
      // Create vehicle_profiles table if it doesn't exist
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS vehicle_profiles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          make VARCHAR(100) NOT NULL,
          model VARCHAR(100) NOT NULL,
          year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
          "batteryCapacity" DECIMAL(10, 2) NOT NULL CHECK ("batteryCapacity" > 0),
          "connectorType" VARCHAR(50) NOT NULL,
          "rangeKm" DECIMAL(10, 2) NOT NULL CHECK ("rangeKm" > 0),
          "averageConsumption" DECIMAL(10, 2),
          "efficiency" DECIMAL(10, 2),
          "chargingCurve" JSONB,
          "drivingMode" VARCHAR(20) DEFAULT 'normal',
          "isPrimary" BOOLEAN DEFAULT FALSE,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Add missing columns to existing table if they don't exist
      await queryRunner.query(`ALTER TABLE vehicle_profiles ADD COLUMN IF NOT EXISTS "averageConsumption" DECIMAL(10, 2)`);
      await queryRunner.query(`ALTER TABLE vehicle_profiles ADD COLUMN IF NOT EXISTS "efficiency" DECIMAL(10, 2)`);
      await queryRunner.query(`ALTER TABLE vehicle_profiles ADD COLUMN IF NOT EXISTS "chargingCurve" JSONB`);
      await queryRunner.query(`ALTER TABLE vehicle_profiles ADD COLUMN IF NOT EXISTS "drivingMode" VARCHAR(20) DEFAULT 'normal'`);
      await queryRunner.query(`ALTER TABLE vehicle_profiles ADD COLUMN IF NOT EXISTS "vehicleType" VARCHAR(50) DEFAULT 'car'`);
      
      // Update existing records to have 'car' as default vehicleType where NULL
      await queryRunner.query(`UPDATE vehicle_profiles SET "vehicleType" = 'car' WHERE "vehicleType" IS NULL`);
      
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_user_id ON vehicle_profiles("userId")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_is_primary ON vehicle_profiles("isPrimary")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_vehicle_type ON vehicle_profiles("vehicleType")`);
      
      // Create trigger function for vehicle_profiles if not exists
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_vehicle_profiles_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS trigger_update_vehicle_profiles_updated_at ON vehicle_profiles
      `);
      
      await queryRunner.query(`
        CREATE TRIGGER trigger_update_vehicle_profiles_updated_at
        BEFORE UPDATE ON vehicle_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_vehicle_profiles_updated_at()
      `);
      
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
      
      // Create indexes
      await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_users ON users(phone) WHERE phone IS NOT NULL`);
      
      console.log('✅ Schema fixes applied successfully');
    } catch (error) {
      console.error('❌ Error applying schema fixes:', error.message);
    } finally {
      await queryRunner.release();
    }
  }
}

