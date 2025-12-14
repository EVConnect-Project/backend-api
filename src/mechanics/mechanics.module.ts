import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MechanicsService } from './mechanics.service';
import { MechanicsController } from './mechanics.controller';
import { MechanicEntity } from './entities/mechanic.entity';
import { UserEntity } from '../users/entities/user.entity';
import { MechanicApplication } from '../mechanic/entities/mechanic-application.entity';
import { Charger } from '../charger/entities/charger.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmergencyModule } from '../emergency/emergency.module';
import { TrafficService } from './services/traffic.service';
import { ServiceMatcherService } from './services/service-matcher.service';
import { EmergencyChatService } from './services/emergency-chat.service';
import { MechanicAvailabilityGateway } from './gateways/mechanic-availability.gateway';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MechanicEntity, UserEntity, MechanicApplication, Charger]),
    NotificationsModule,
    forwardRef(() => EmergencyModule),
    ChatModule,
  ],
  controllers: [MechanicsController],
  providers: [MechanicsService, TrafficService, ServiceMatcherService, EmergencyChatService, MechanicAvailabilityGateway],
  exports: [MechanicsService, TrafficService, ServiceMatcherService, EmergencyChatService, MechanicAvailabilityGateway],
})
export class MechanicsModule {}
