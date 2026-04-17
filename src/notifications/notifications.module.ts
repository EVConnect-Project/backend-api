import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { FirebaseNotificationService } from "./services/firebase-notification.service";
import { NotificationsGateway } from "./notifications.gateway";
import { FcmTokenEntity } from "./entities/fcm-token.entity";
import { NotificationLogEntity } from "./entities/notification-log.entity";
import { NotificationPreferenceEntity } from "./entities/notification-preference.entity";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FcmTokenEntity,
      NotificationLogEntity,
      NotificationPreferenceEntity,
    ]),
    ConfigModule,
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    FirebaseNotificationService,
    NotificationsGateway,
  ],
  exports: [
    NotificationsService,
    FirebaseNotificationService,
    NotificationsGateway,
  ],
})
export class NotificationsModule {}
