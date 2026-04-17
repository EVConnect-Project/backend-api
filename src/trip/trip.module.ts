import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TripService } from "./trip.service";
import { TripController } from "./trip.controller";

@Module({
  imports: [HttpModule],
  providers: [TripService],
  controllers: [TripController],
  exports: [TripService],
})
export class TripModule {}
