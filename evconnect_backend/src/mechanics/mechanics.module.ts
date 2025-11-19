import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MechanicsService } from './mechanics.service';
import { MechanicsController } from './mechanics.controller';
import { MechanicEntity } from './entities/mechanic.entity';
import { UserEntity } from '../users/entities/user.entity';
import { MechanicApplication } from '../mechanic/entities/mechanic-application.entity';
import { Charger } from '../charger/entities/charger.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MechanicEntity, UserEntity, MechanicApplication, Charger])],
  controllers: [MechanicsController],
  providers: [MechanicsService],
  exports: [MechanicsService],
})
export class MechanicsModule {}
