import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  Request,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { TripPlannerService } from "./trip-planner.service";
import { SmartTripPlannerService } from "./services/smart-trip-planner.service";
import { PlanRouteDto } from "./dto/plan-route.dto";
import { RouteResponseDto } from "./dto/route-response.dto";
import {
  SmartTripPlanDto,
  DrivingMode,
  RouteObjective,
} from "./dto/smart-trip-plan.dto";
import { RouteAlternativeDto } from "./dto/route-alternative.dto";
import { RoutesResponseDto } from "./dto/routes-response.dto";
import { SaveTripDto } from "./dto/save-trip.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TripPlanEntity } from "./entities/trip-plan.entity";

@Controller("trip-planner")
@UseGuards(JwtAuthGuard)
export class TripPlannerController {
  constructor(
    private readonly tripPlannerService: TripPlannerService,
    private readonly smartTripPlannerService: SmartTripPlannerService,
    @InjectRepository(TripPlanEntity)
    private readonly tripPlanRepository: Repository<TripPlanEntity>,
  ) {}

  @Post("route")
  async planRoute(
    @Body() planRouteDto: PlanRouteDto,
    @Request() req,
  ): Promise<RouteResponseDto> {
    return this.tripPlannerService.planRoute(planRouteDto, req.user.userId);
  }

  @Post("smart-route")
  async planSmartRoute(
    @Body(ValidationPipe) smartTripPlanDto: SmartTripPlanDto,
    @Request() req,
  ): Promise<RouteAlternativeDto[]> {
    return this.smartTripPlannerService.generateSmartRoutes(
      smartTripPlanDto,
      req.user.userId,
    );
  }

  @Get("routes")
  async getRoutes(
    @Query("origin") origin: string,
    @Query("destination") destination: string,
    @Query("vehicleId") vehicleId: string | undefined,
    @Query("currentBatteryPercent") currentBatteryPercent: string | undefined,
    @Query("waypoints") waypoints: string | undefined,
    @Query("preferredNetworks") preferredNetworks: string | undefined,
    @Query("excludedNetworks") excludedNetworks: string | undefined,
    @Query("ambientTemperatureC") ambientTemperatureC: string | undefined,
    @Query("windSpeedKph") windSpeedKph: string | undefined,
    @Query("elevationDeltaM") elevationDeltaM: string | undefined,
    @Query("hvacLoadKw") hvacLoadKw: string | undefined,
    @Query("drivingMode") drivingMode: string | undefined,
    @Query("routeObjective") routeObjective: string | undefined,
    @Query("minChargeAtChargingStationPercent")
    minChargeAtChargingStationPercent: string | undefined,
    @Query("targetBatteryPercent") targetBatteryPercent: string | undefined,
    @Query("startAddress") startAddress: string | undefined,
    @Query("destAddress") destAddress: string | undefined,
    @Request() req,
  ): Promise<RoutesResponseDto> {
    const parseLatLng = (
      value: string,
      field: string,
    ): { lat: number; lng: number } => {
      const [latRaw, lngRaw] = (value || "").split(",");
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new BadRequestException(
          `Invalid ${field}. Expected format: lat,lng`,
        );
      }
      return { lat, lng };
    };

    const originPoint = parseLatLng(origin, "origin");
    const destinationPoint = parseLatLng(destination, "destination");
    const parseOptionalNumber = (value?: string): number | undefined => {
      if (value == null || value.trim().length === 0) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    const parseCsv = (value?: string): string[] | undefined => {
      if (!value || value.trim().length === 0) return undefined;
      const items = value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      return items.length > 0 ? items : undefined;
    };
    const parseWaypoints = (
      value?: string,
    ): Array<{ lat: number; lng: number; address?: string }> | undefined => {
      if (!value || value.trim().length === 0) return undefined;

      const parsed = value
        .split("|")
        .map((token) => token.trim())
        .filter((token) => token.length > 0)
        .map((token) => {
          const [latRaw, lngRaw] = token.split(",");
          const lat = Number(latRaw);
          const lng = Number(lngRaw);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return { lat, lng };
        })
        .filter(
          (point): point is { lat: number; lng: number } => point != null,
        );

      return parsed.length > 0 ? parsed : undefined;
    };
    const parseDrivingMode = (value?: string): DrivingMode => {
      if (!value) return DrivingMode.NORMAL;
      const normalized = value.toLowerCase();
      if (normalized === DrivingMode.ECO) return DrivingMode.ECO;
      if (normalized === DrivingMode.SPORT) return DrivingMode.SPORT;
      return DrivingMode.NORMAL;
    };
    const parseRouteObjective = (value?: string): RouteObjective => {
      if (!value) return RouteObjective.BALANCED;
      const normalized = value.toLowerCase();
      if (normalized === RouteObjective.FASTEST) return RouteObjective.FASTEST;
      if (normalized === RouteObjective.CHEAPEST)
        return RouteObjective.CHEAPEST;
      return RouteObjective.BALANCED;
    };

    const resolvedVehicleId =
      await this.smartTripPlannerService.resolveVehicleIdForUser(
        req.user.userId,
        vehicleId,
      );

    const battery = parseOptionalNumber(currentBatteryPercent);
    const smartTripRequest: SmartTripPlanDto = {
      startLat: originPoint.lat,
      startLng: originPoint.lng,
      destLat: destinationPoint.lat,
      destLng: destinationPoint.lng,
      vehicleId: resolvedVehicleId,
      currentBatteryPercent: battery ?? 80,
      startAddress,
      destAddress,
      waypoints: parseWaypoints(waypoints),
      preferredNetworks: parseCsv(preferredNetworks),
      excludedNetworks: parseCsv(excludedNetworks),
      ambientTemperatureC: parseOptionalNumber(ambientTemperatureC),
      windSpeedKph: parseOptionalNumber(windSpeedKph),
      elevationDeltaM: parseOptionalNumber(elevationDeltaM),
      hvacLoadKw: parseOptionalNumber(hvacLoadKw),
      drivingMode: parseDrivingMode(drivingMode),
      routeObjective: parseRouteObjective(routeObjective),
      minChargeAtChargingStationPercent:
        parseOptionalNumber(minChargeAtChargingStationPercent) ?? 15,
      targetBatteryPercent: parseOptionalNumber(targetBatteryPercent) ?? 70,
    };

    const alternatives = await this.smartTripPlannerService.generateSmartRoutes(
      smartTripRequest,
      req.user.userId,
    );

    const best =
      alternatives.find((route) => route.isRecommended) ?? alternatives[0];
    const bestRouteId = best ? String(best.routeNumber) : null;

    return {
      routes: alternatives.map((route) => ({
        id: String(route.routeNumber),
        routeNumber: route.routeNumber,
        distance: `${route.totalDistanceKm.toFixed(1)} km`,
        duration: `${route.totalDurationMinutes} min`,
        polyline: route.routePolyline,
        chargingStops: route.chargingStops,
        totalDistanceKm: route.totalDistanceKm,
        totalDurationMinutes: route.totalDurationMinutes,
        drivingDurationMinutes: route.drivingDurationMinutes,
        totalChargingTimeMinutes: route.totalChargingTimeMinutes,
        totalChargingCostLkr: route.totalChargingCostLkr,
        estimatedArrivalTime: route.estimatedArrivalTime,
        routeScore: route.routeScore,
        routePolyline: route.routePolyline,
        routeCoordinates: route.routeCoordinates,
        routePolylineGeometryStatus: route.routePolylineGeometryStatus,
        routePolylinePointsCount: route.routePolylinePointsCount,
        routeSummary: route.routeSummary,
        isRecommended: route.isRecommended,
        safetyWarnings: route.safetyWarnings,
        drivingMode: route.drivingMode,
        arrivalBatteryPercent: route.arrivalBatteryPercent,
        etaConfidencePercent: route.etaConfidencePercent,
        socConfidencePercent: route.socConfidencePercent,
        energyAdjustmentPercent: route.energyAdjustmentPercent,
        weatherPenaltyPercent: route.weatherPenaltyPercent,
        elevationPenaltyPercent: route.elevationPenaltyPercent,
        hvacPenaltyPercent: route.hvacPenaltyPercent,
      })),
      bestRouteId,
    };
  }

  /**
   * Save a selected route as a trip plan
   */
  @Post("trips")
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
      drivingDurationMinutes:
        saveTripDto.drivingDurationMinutes || saveTripDto.totalDurationMinutes,
      totalChargingTimeMinutes: saveTripDto.totalChargingTimeMinutes || 0,
      totalChargingCostLkr: saveTripDto.totalChargingCostLkr || 0,
      routeScore: saveTripDto.routeScore || 0,
      routePolyline: saveTripDto.routePolyline,
      routeSummary: saveTripDto.routeSummary,
      drivingMode: saveTripDto.drivingMode || "normal",
      startBatteryPercent: saveTripDto.startBatteryPercent || 80,
      arrivalBatteryPercent: saveTripDto.arrivalBatteryPercent || 0,
      chargingStops: saveTripDto.chargingStops || [],
      safetyWarnings: saveTripDto.safetyWarnings || [],
      status: "planned",
    });

    return this.tripPlanRepository.save(trip);
  }

  @Post("create")
  async createTrip(
    @Body(ValidationPipe) saveTripDto: SaveTripDto,
    @Request() req,
  ): Promise<TripPlanEntity> {
    return this.saveTrip(saveTripDto, req);
  }

  /**
   * Get user's trip history
   */
  @Get("trips")
  async getUserTrips(
    @Request() req,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ): Promise<{ trips: TripPlanEntity[]; total: number }> {
    const [trips, total] = await this.tripPlanRepository.findAndCount({
      where: { userId: req.user.userId },
      order: { createdAt: "DESC" },
      take: limit || 20,
      skip: offset || 0,
    });

    return { trips, total };
  }

  /**
   * Get a specific trip by ID
   */
  @Get("trips/:id")
  async getTripById(
    @Param("id") id: string,
    @Request() req,
  ): Promise<TripPlanEntity> {
    const trip = await this.tripPlanRepository.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!trip) {
      throw new NotFoundException("Trip not found");
    }

    return trip;
  }

  @Get("trips/:id/live")
  async getTripLiveState(
    @Param("id") id: string,
    @Request() req,
  ): Promise<{
    tripId: string;
    status: TripPlanEntity["status"];
    currentLat: number | null;
    currentLng: number | null;
    currentHeading: number | null;
    currentSpeedKph: number | null;
    lastLocationAt: string | null;
    isStale: boolean;
    heartbeatAgeSeconds: number | null;
  }> {
    const trip = await this.getTripById(id, req);
    const now = Date.now();
    const lastLocationMs = trip.lastLocationAt
      ? trip.lastLocationAt.getTime()
      : null;
    const heartbeatAgeSeconds =
      lastLocationMs != null
        ? Math.max(0, Math.floor((now - lastLocationMs) / 1000))
        : null;
    const isStale =
      heartbeatAgeSeconds != null ? heartbeatAgeSeconds > 45 : true;

    return {
      tripId: trip.id,
      status: trip.status,
      currentLat: trip.currentLat != null ? Number(trip.currentLat) : null,
      currentLng: trip.currentLng != null ? Number(trip.currentLng) : null,
      currentHeading:
        trip.currentHeading != null ? Number(trip.currentHeading) : null,
      currentSpeedKph:
        trip.currentSpeedKph != null ? Number(trip.currentSpeedKph) : null,
      lastLocationAt: trip.lastLocationAt
        ? trip.lastLocationAt.toISOString()
        : null,
      isStale,
      heartbeatAgeSeconds,
    };
  }

  @Get(":id")
  async getTripByIdAlias(
    @Param("id") id: string,
    @Request() req,
  ): Promise<TripPlanEntity> {
    return this.getTripById(id, req);
  }

  /**
   * Update trip status (e.g., active, completed, cancelled)
   */
  @Patch("trips/:id/status")
  async updateTripStatus(
    @Param("id") id: string,
    @Body() body: { status: "planned" | "active" | "completed" | "cancelled" },
    @Request() req,
  ): Promise<TripPlanEntity> {
    const trip = await this.tripPlanRepository.findOne({
      where: { id, userId: req.user.userId },
    });

    if (!trip) {
      throw new NotFoundException("Trip not found");
    }

    trip.status = body.status;
    return this.tripPlanRepository.save(trip);
  }

  @Post("start")
  async startTrip(
    @Body() body: { tripId: string },
    @Request() req,
  ): Promise<TripPlanEntity> {
    return this.updateTripStatus(body.tripId, { status: "active" }, req);
  }

  @Post("end")
  async endTrip(
    @Body() body: { tripId: string },
    @Request() req,
  ): Promise<TripPlanEntity> {
    return this.updateTripStatus(body.tripId, { status: "completed" }, req);
  }
}
