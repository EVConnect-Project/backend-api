import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingEntity } from './entities/booking.entity';
import { Charger } from '../charger/entities/charger.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingEntity, Charger]),
    ScheduleModule.forRoot(), // Enable cron jobs for auto-cancel
    NotificationsModule, // Import to use NotificationsService
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
