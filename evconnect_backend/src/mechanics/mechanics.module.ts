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

@Module({
  imports: [
    TypeOrmModule.forFeature([MechanicEntity, UserEntity, MechanicApplication, Charger]),
    NotificationsModule,
    forwardRef(() => EmergencyModule),
  ],
  controllers: [MechanicsController],
  providers: [MechanicsService],
  exports: [MechanicsService],
})
export class MechanicsModule {}
