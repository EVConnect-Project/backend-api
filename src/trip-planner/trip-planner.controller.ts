import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, ValidationPipe, Request, NotFoundException } from '@nestjs/common';
import { TripPlannerService } from './trip-planner.service';
import { SmartTripPlannerService } from './services/smart-trip-planner.service';
import { PlanRouteDto } from './dto/plan-route.dto';
import { RouteResponseDto } from './dto/route-response.dto';
import { SmartTripPlanDto } from './dto/smart-trip-plan.dto';
import { RouteAlternativeDto } from './dto/route-alternative.dto';
import { SaveTripDto } from './dto/save-trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripPlanEntity } from './entities/trip-plan.entity';

@Controller('trip-planner')
@UseGuards(JwtAuthGuard)
export class TripPlannerController {
  constructor(
    private readonly tripPlannerService: TripPlannerService,
    private readonly smartTripPlannerService: SmartTripPlannerService,
    @InjectRepository(TripPlanEntity)
    private readonly tripPlanRepository: Repository<TripPlanEntity>,
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

  /**
   * Save a selected route as a trip plan
   */
  @Post('trips')
  async saveTrip(
    @Body(ValidationPipe) saveTripDto: SaveTripDto,
    @Request() req,
  ): Promise<TripPlanEntity> {
    const trip = this.tripPlanRepository.create({
      userId: req.user.userId,
      vehicleId: saveTripDto.vehicleId,
      startLat: saveTripDto.startLat,
      startLng: saveTripDto.startLng,
      startAddress: saveTripDto.startAddress,
      destLat: saveTripDto.destLat,
      destLng: saveTripDto.destLng,
      destAddress: saveTripDto.destAddress,
      waypoints: saveTripDto.waypoints || [],
      totalDistanceKm: saveTripDto.totalDistanceKm,
      totalDurationMinutes: saveTripDto.totalDurationMinutes,
      drivingDurationMinutes: saveTripDto.drivingDurationMinutes || saveTripDto.totalDurationMinutes,
      totalChargingTimeMinutes: saveTripDto.totalChargingTimeMinutes || 0,
      totalChargingCostLkr: saveTripDto.totalChargingCostLkr || 0,
      routeScore: saveTripDto.routeScore || 0,
      routePolyline: saveTripDto.routePolyline,
      routeSummary: saveTripDto.routeSummary,
      drivingMode: saveTripDto.drivingMode || 'normal',
      startBatteryPercent: saveTripDto.startBatteryPercent || 80,
      arrivalBatteryPercent: saveTripDto.arrivalBatteryPercent || 0,
      chargingStops: saveTripDto.chargingStops || [],
      safetyWarnings: saveTripDto.safetyWarnings || [],
      status: 'planned',
    });

    return this.tripPlanRepository.save(trip);
  }

  /**
   * Get user's trip history
   */
  @Get('trips')
  async getUserTrips(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ trips: TripPlanEntity[]; total: number }> {
    const [trips, total] = await this.tripPlanRepository.findAndCount({
      where: { userId: req.user.userId },
      order: { createdAt: 'DESC' },
      take: limit || 20,
      skip: offset || 0,
    });

    return { trips, total };
  }

  /**
   * Get a specific trip by ID
   */
  @Get('trips/:id')
  async getTripById(
    @Param('id') id: string,
    @Request() req,
  ): Promise<TripPlanEntity> {
    const trip = await this.tripPlanRepository.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  /**
   * Update trip status (e.g., active, completed, cancelled)
   */
  @Patch('trips/:id/status')
  async updateTripStatus(
    @Param('id') id: string,
    @Body() body: { status: 'planned' | 'active' | 'completed' | 'cancelled' },
    @Request() req,
  ): Promise<TripPlanEntity> {
    const trip = await this.tripPlanRepository.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    trip.status = body.status;
    return this.tripPlanRepository.save(trip);
  }
}
