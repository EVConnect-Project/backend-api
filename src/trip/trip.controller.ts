import { Controller, Post, Body, UseGuards, Get, Param } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TripService } from "./trip.service";
import { CreateTripPlanDto } from "./dto/create-trip-plan.dto";
import { TripPlanResponseDto } from "./dto/trip-plan-response.dto";

@Controller("trip")
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post("plan")
  @UseGuards(JwtAuthGuard)
  async createTripPlan(
    @Body() createTripPlanDto: CreateTripPlanDto,
  ): Promise<TripPlanResponseDto> {
    return this.tripService.createTripPlan(createTripPlanDto);
  }

  @Get("health")
  async healthCheck() {
    return {
      status: "ok",
      service: "Trip Planning Service",
      timestamp: new Date().toISOString(),
    };
  }
}
