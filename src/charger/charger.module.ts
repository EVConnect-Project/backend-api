import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChargerService } from './charger.service';
import { ChargerController } from './charger.controller';
import { Charger } from './entities/charger.entity';
import { ChargingStation } from '../owner/entities/charging-station.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { AuthModule } from '../auth/auth.module';
import { ChargerIntegrationModule } from '../charger-integration/charger-integration.module';
import { ChargersGateway } from './chargers.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Charger, ChargingStation, BookingEntity]),
    AuthModule,
    forwardRef(() => ChargerIntegrationModule),
  ],
  controllers: [ChargerController],
  providers: [ChargerService, ChargersGateway],
  exports: [ChargerService, ChargersGateway],
})
export class ChargerModule {}
