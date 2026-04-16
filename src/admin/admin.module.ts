import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminChatService } from './admin-chat.service';
import { AdminAuditService } from './admin-audit.service';
import { UserEntity } from '../users/entities/user.entity';
import { Charger } from '../charger/entities/charger.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { MechanicApplication } from '../mechanic/entities/mechanic-application.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';
import { MarketplaceListing } from '../marketplace/entities/marketplace-listing.entity';
import { Conversation } from '../chat/entities/conversation.entity';
import { Message } from '../chat/entities/message.entity';
import { AdminAction } from './entities/admin-action.entity';
import { OwnerPaymentAccount } from '../owner/entities/owner-payment-account.entity';
import { ChargingStation } from '../owner/entities/charging-station.entity';
import { ChargerSocket } from '../owner/entities/charger-socket.entity';
import { VehicleProfile } from '../auth/entities/vehicle-profile.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationLogEntity } from '../notifications/entities/notification-log.entity';
import { ChargingModule } from '../charging/charging.module';
import { ServiceStationApplicationEntity } from '../service-stations/entities/service-station-application.entity';
import { ServiceStationEntity } from '../service-stations/entities/service-station.entity';
import { SupportReport } from '../support/entities/support-report.entity';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      Charger,
      BookingEntity,
      MechanicApplication,
      MechanicEntity,
      MarketplaceListing,
      Conversation,
      Message,
      AdminAction,
      OwnerPaymentAccount,
      ChargingStation,
      ChargerSocket,
      VehicleProfile,
      NotificationLogEntity,
      ServiceStationApplicationEntity,
      ServiceStationEntity,
      SupportReport,
    ]),
    NotificationsModule,
    ChargingModule,
    SupportModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminChatService, AdminAuditService],
  exports: [AdminService, AdminChatService, AdminAuditService],
})
export class AdminModule {}
