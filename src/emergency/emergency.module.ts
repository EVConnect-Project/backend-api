import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmergencyService } from "./emergency.service";
import { EmergencyController } from "./emergency.controller";
import { EmergencyRequestEntity } from "./entities/emergency-request.entity";
import { MechanicResponseEntity } from "./entities/mechanic-response.entity";
import { MechanicEntity } from "../mechanics/entities/mechanic.entity";
import { UserEntity } from "../users/entities/user.entity";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyRequestEntity,
      MechanicResponseEntity,
      MechanicEntity,
      UserEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [EmergencyController],
  providers: [EmergencyService],
  exports: [EmergencyService],
})
export class EmergencyModule {}
