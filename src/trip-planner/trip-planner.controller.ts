import { Controller, Post, Body, UseGuards, ValidationPipe, Request } from '@nestjs/common';
import { TripPlannerService } from './trip-planner.service';
import { SmartTripPlannerService } from './services/smart-trip-planner.service';
import { PlanRouteDto } from './dto/plan-route.dto';
import { RouteResponseDto } from './dto/route-response.dto';
import { SmartTripPlanDto } from './dto/smart-trip-plan.dto';
import { RouteAlternativeDto } from './dto/route-alternative.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('trip-planner')
@UseGuards(JwtAuthGuard)
export class TripPlannerController {
  constructor(
    private readonly tripPlannerService: TripPlannerService,
    private readonly smartTripPlannerService: SmartTripPlannerService,
  ) {}

  @Post('route')
  async planRoute(
    @Body() planRouteDto: PlanRouteDto,
    @Request() req,
  ): Promise<RouteResponseDto> {
    return this.tripPlannerService.planRoute(planRouteDto, req.user.userId);
  }

  @Post('smart-route')
  async planSmartRoute(
    @Body(ValidationPipe) smartTripPlanDto: SmartTripPlanDto,
    @Request() req,
  ): Promise<RouteAlternativeDto[]> {
    return this.smartTripPlannerService.generateSmartRoutes(
      smartTripPlanDto,
      req.user.userId,
    );
  }
}
