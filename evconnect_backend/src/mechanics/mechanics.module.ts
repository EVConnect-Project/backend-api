import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MechanicsService } from './mechanics.service';
import { MechanicsController } from './mechanics.controller';
import { MechanicEntity } from './entities/mechanic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MechanicEntity])],
  controllers: [MechanicsController],
  providers: [MechanicsService],
  exports: [MechanicsService],
})
export class MechanicsModule {}
