import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TripPlannerController } from './trip-planner.controller';
import { TripPlannerService } from './trip-planner.service';
import { SmartTripPlannerService } from './services/smart-trip-planner.service';
import { Charger } from '../charger/entities/charger.entity';
import { VehicleProfile } from '../auth/entities/vehicle-profile.entity';
import { TripPlanEntity } from './entities/trip-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Charger, VehicleProfile, TripPlanEntity]),
    HttpModule,
  ],
  controllers: [TripPlannerController],
  providers: [TripPlannerService, SmartTripPlannerService],
  exports: [TripPlannerService, SmartTripPlannerService],
})
export class TripPlannerModule {}
