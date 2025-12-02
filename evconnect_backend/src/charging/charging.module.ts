import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChargingController } from './charging.controller';
import { ChargingService } from './charging.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    HttpModule,
    NotificationsModule, // For charging event notifications
  ],
  controllers: [ChargingController],
  providers: [ChargingService],
  exports: [ChargingService],
})
export class ChargingModule {}
