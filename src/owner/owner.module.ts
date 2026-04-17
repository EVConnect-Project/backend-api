import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { OwnerController } from './owner.controller';
import { OwnerService } from './owner.service';
import { OwnerPaymentAccountController } from './owner-payment-account.controller';
import { OwnerPaymentAccountService } from './owner-payment-account.service';
import { IsChargerOwnerGuard } from './guards/is-charger-owner.guard';
import { Charger } from '../charger/entities/charger.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { OwnerPaymentAccount } from './entities/owner-payment-account.entity';
import { ChargerSocket } from './entities/charger-socket.entity';
import { ChargingStation } from './entities/charging-station.entity';
import { Station } from '../station/entities/station.entity';
import { ChargerModule } from '../charger/charger.module';
import { AuthModule } from '../auth/auth.module';
import { ServiceStationApplicationEntity } from '../service-stations/entities/service-station-application.entity';
import { ServiceStationEntity } from '../service-stations/entities/service-station.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Charger,
      BookingEntity,
      UserEntity,
      OwnerPaymentAccount,
      ChargerSocket,
      ChargingStation,
      Station,
      ServiceStationApplicationEntity,
      ServiceStationEntity,
    ]),
    HttpModule,
    ChargerModule,
    AuthModule,
  ],
  controllers: [OwnerController, OwnerPaymentAccountController],
  providers: [OwnerService, OwnerPaymentAccountService, IsChargerOwnerGuard],
  exports: [OwnerService, OwnerPaymentAccountService],
})
export class OwnerModule {}
