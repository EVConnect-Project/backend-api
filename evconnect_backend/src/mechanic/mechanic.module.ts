import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MechanicController } from './mechanic.controller';
import { MechanicService } from './mechanic.service';
import { MechanicApplication } from './entities/mechanic-application.entity';
import { UserEntity } from '../users/entities/user.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MechanicApplication, UserEntity, MechanicEntity])],
  controllers: [MechanicController],
  providers: [MechanicService],
  exports: [MechanicService],
})
export class MechanicModule {}
