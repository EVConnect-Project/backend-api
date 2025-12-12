import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Charger,
      BookingEntity,
      UserEntity,
      OwnerPaymentAccount,
      ChargerSocket,
      ChargingStation,
    ]),
  ],
  controllers: [OwnerController, OwnerPaymentAccountController],
  providers: [OwnerService, OwnerPaymentAccountService, IsChargerOwnerGuard],
  exports: [OwnerService, OwnerPaymentAccountService],
})
export class OwnerModule {}
