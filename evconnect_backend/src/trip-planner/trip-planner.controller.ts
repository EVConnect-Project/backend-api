import { Controller, Post, Body, UseGuards, ValidationPipe, Request } from '@nestjs/common';
import { TripPlannerService } from './trip-planner.service';
import { PlanRouteDto } from './dto/plan-route.dto';
import { RouteResponseDto } from './dto/route-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('trip-planner')
@UseGuards(JwtAuthGuard)
export class TripPlannerController {
  constructor(private readonly tripPlannerService: TripPlannerService) {}

  @Post('route')
  async planRoute(
    @Body() planRouteDto: PlanRouteDto,
    @Request() req,
  ): Promise<RouteResponseDto> {
    return this.tripPlannerService.planRoute(planRouteDto, req.user.userId);
  }
}
