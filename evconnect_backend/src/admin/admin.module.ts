import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserEntity } from '../users/entities/user.entity';
import { Charger } from '../charger/entities/charger.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { MechanicApplication } from '../mechanic/entities/mechanic-application.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, Charger, BookingEntity, MechanicApplication, MechanicEntity]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
