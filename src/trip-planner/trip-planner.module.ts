import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripPlannerController } from './trip-planner.controller';
import { TripPlannerService } from './trip-planner.service';
import { Charger } from '../charger/entities/charger.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Charger])],
  controllers: [TripPlannerController],
  providers: [TripPlannerService],
  exports: [TripPlannerService],
})
export class TripPlannerModule {}
