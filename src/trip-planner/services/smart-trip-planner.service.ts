import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charger } from '../../charger/entities/charger.entity';
import { VehicleProfile } from '../../auth/entities/vehicle-profile.entity';
import { SmartTripPlanDto, DrivingMode, RouteObjective } from '../dto/smart-trip-plan.dto';
import { RouteAlternativeDto, ChargerStopDto, SafetyWarningDto } from '../dto/route-alternative.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface RouteSegment {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distance: number; // km
  duration: number; // minutes
}

interface EnergyAdjustmentContext {
  multiplier: number;
  weatherPenalty: number;
  elevationPenalty: number;
  hvacPenalty: number;
}

// Energy multipliers per driving mode
const DRIVING_MODE_MULTIPLIERS: Record<string, number> = {
  eco: 0.85,
  normal: 1.0,
  sport: 1.25,
};

// Non-linear charging curve: power tapers above 80%
const DEFAULT_CHARGING_CURVE = [
  { percentage: 0, factor: 1.0 },
  { percentage: 20, factor: 1.0 },
  { percentage: 50, factor: 0.95 },
  { percentage: 80, factor: 0.65 },
  { percentage: 90, factor: 0.35 },
  { percentage: 100, factor: 0.15 },
];

@Injectable()
export class SmartTripPlannerService {
  private readonly logger = new Logger(SmartTripPlannerService.name);
  private readonly GOOGLE_MAPS_API_KEY =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    'AIzaSyC9HoLlBFBxkOADOS5OXBU1nF2Rbw5os6w';
  private readonly SAFETY_BUFFER = 0.8; // 20% reserve
  private readonly CHARGER_SEARCH_RADIUS = 10; // km
  private readonly ROUTE_SEGMENT_LENGTH = 25; // km
  private readonly MIN_BATTERY_THRESHOLD = 15; // % minimum before charging

  constructor(
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    @InjectRepository(VehicleProfile)
    private vehicleRepository: Repository<VehicleProfile>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Main entry point: Generate 2-3 smart route alternatives
   */
  async generateSmartRoutes(dto: SmartTripPlanDto, userId: string): Promise<RouteAlternativeDto[]> {
    this.logger.log(`Generating smart routes for user ${userId}`);

    // 1. Get vehicle details
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: dto.vehicleId, userId },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const drivingMode = dto.drivingMode || vehicle.drivingMode || DrivingMode.NORMAL;
    const routeObjective = dto.routeObjective || RouteObjective.BALANCED;
    const currentBattery = dto.currentBatteryPercent ?? 80;
    const targetBattery = dto.targetBatteryPercent ?? 80;
    const minChargeAtChargingStation =
      dto.minChargeAtChargingStationPercent ?? this.MIN_BATTERY_THRESHOLD;
    const preferredNetworks = this.normalizeNetworkKeywords(dto.preferredNetworks);
    const excludedNetworks = this.normalizeNetworkKeywords(dto.excludedNetworks);

    if (targetBattery >= currentBattery) {
      throw new BadRequestException(
        `targetBatteryPercent must be less than currentBatteryPercent (${currentBattery})`,
      );
    }

    if (targetBattery <= minChargeAtChargingStation) {
      throw new BadRequestException(
        `targetBatteryPercent must be greater than minChargeAtChargingStationPercent (${minChargeAtChargingStation})`,
      );
    }

    const energyAdjustment = await this.buildEnergyAdjustmentContext(dto);

    // 2. Get Google Maps route alternatives (up to 3) — with waypoints
    const googleRoutes = await this.getGoogleDirections(
      dto.startLat,
      dto.startLng,
      dto.destLat,
      dto.destLng,
      dto.waypoints,
    );

    // 3. Process each route and add charging stops
    const routeAlternatives: RouteAlternativeDto[] = [];

    for (let i = 0; i < Math.min(googleRoutes.length, 3); i++) {
      const googleRoute = googleRoutes[i];
      
      const alternative = await this.processRoute(
        googleRoute,
        vehicle,
        currentBattery,
        dto.startLat,
        dto.startLng,
        i + 1,
        drivingMode,
        routeObjective,
        preferredNetworks,
        excludedNetworks,
        minChargeAtChargingStation,
        targetBattery,
        energyAdjustment,
      );

      routeAlternatives.push(alternative);
    }

    // 4. Rank routes by score
    routeAlternatives.sort((a, b) => a.routeScore - b.routeScore);

    // 5. Mark the best route
    if (routeAlternatives.length > 0) {
      routeAlternatives[0].isRecommended = true;
    }

    return routeAlternatives;
  }

  /**
   * Get route alternatives from Google Directions API — supports waypoints
   */
  private async getGoogleDirections(
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number,
    waypoints?: { lat: number; lng: number; address?: string }[],
  ): Promise<any[]> {
    const fallback = () => this.getFallbackRoute(startLat, startLng, destLat, destLng, waypoints);

    if (!this.GOOGLE_MAPS_API_KEY) {
      this.logger.warn('GOOGLE_MAPS_API_KEY not configured. Using OSRM fallback geometry.');
      return fallback();
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json`;
      const params: Record<string, string> = {
        origin: `${startLat},${startLng}`,
        destination: `${destLat},${destLng}`,
        alternatives: 'true',
        mode: 'driving',
        traffic_model: 'best_guess',
        departure_time: 'now',
        key: this.GOOGLE_MAPS_API_KEY,
      };

      // Add waypoints if provided
      if (waypoints && waypoints.length > 0) {
        params.waypoints = waypoints
          .map(wp => `${wp.lat},${wp.lng}`)
          .join('|');
        // With waypoints, Google does not return alternatives
        params.alternatives = 'false';
      }

      const response = await firstValueFrom(
        this.httpService.get(url, { params }),
      );

      if (response.data.status === 'OK') {
        return response.data.routes;
      }

      this.logger.warn(`Google Directions API returned: ${response.data.status}`);
      return fallback();
    } catch (error) {
      this.logger.error(`Error calling Google Maps API: ${error.message}`);
      return fallback();
    }
  }

  /**
   * Fallback route calculation with real road geometry via OSRM.
   * Falls back to direct-line estimate only if OSRM is unavailable.
   */
  private async getFallbackRoute(
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number,
    waypoints?: { lat: number; lng: number; address?: string }[],
  ): Promise<any[]> {
    try {
      const routeCoords = [
        { lat: startLat, lng: startLng },
        ...(waypoints || []).map((wp) => ({ lat: wp.lat, lng: wp.lng })),
        { lat: destLat, lng: destLng },
      ];

      const osrmRoutes = await this.getOsrmDirections(routeCoords);
      if (osrmRoutes.length > 0) {
        return osrmRoutes;
      }
    } catch (error) {
      this.logger.warn(`OSRM fallback failed: ${error.message}`);
    }

    // Last-resort fallback if both Google and OSRM fail.
    const distance = this.calculateHaversineDistance(startLat, startLng, destLat, destLng);
    const avgSpeedKmh = 60;
    const durationSeconds = (distance / avgSpeedKmh) * 3600;

    return [{
      legs: [{
        distance: { value: distance * 1000, text: `${distance.toFixed(1)} km` },
        duration: { value: durationSeconds, text: `${Math.round(durationSeconds / 60)} mins` },
        duration_in_traffic: { value: durationSeconds * 1.15, text: `${Math.round(durationSeconds * 1.15 / 60)} mins` },
        steps: [],
      }],
      overview_polyline: { points: '' },
      summary: 'Direct route (estimated)',
    }];
  }

  private async getOsrmDirections(
    routeCoords: Array<{ lat: number; lng: number }>,
  ): Promise<any[]> {
    const coordinates = routeCoords
      .map((point) => `${point.lng},${point.lat}`)
      .join(';');

    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
      `?overview=full&geometries=polyline&steps=true&alternatives=true`;

    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data;

    if (!data || data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
      return [];
    }

    return data.routes.map((route, index) => {
      const legs = Array.isArray(route.legs) ? route.legs : [];
      const totalDistance = Number(route.distance || 0);
      const totalDuration = Number(route.duration || 0);

      return {
        legs: legs.length > 0
          ? legs.map((leg) => ({
              distance: {
                value: Number(leg.distance || 0),
                text: `${(Number(leg.distance || 0) / 1000).toFixed(1)} km`,
              },
              duration: {
                value: Number(leg.duration || 0),
                text: `${Math.round(Number(leg.duration || 0) / 60)} mins`,
              },
              duration_in_traffic: {
                value: Number(leg.duration || 0),
                text: `${Math.round(Number(leg.duration || 0) / 60)} mins`,
              },
              steps: leg.steps || [],
            }))
          : [{
              distance: {
                value: totalDistance,
                text: `${(totalDistance / 1000).toFixed(1)} km`,
              },
              duration: {
                value: totalDuration,
                text: `${Math.round(totalDuration / 60)} mins`,
              },
              duration_in_traffic: {
                value: totalDuration,
                text: `${Math.round(totalDuration / 60)} mins`,
              },
              steps: [],
            }],
        overview_polyline: {
          points: route.geometry || '',
        },
        summary: route.legs?.[0]?.summary || `OSRM route ${index + 1}`,
      };
    });
  }

  /**
   * Process a single route: add charging stops, calculate score
   */
  private async processRoute(
    googleRoute: any,
    vehicle: VehicleProfile,
    currentBatteryPercent: number,
    startLat: number,
    startLng: number,
    routeNumber: number,
    drivingMode: string,
    routeObjective: RouteObjective,
    preferredNetworks: string[],
    excludedNetworks: string[],
    minChargeAtChargingStationPercent: number,
    targetBatteryPercent: number,
    energyAdjustment: EnergyAdjustmentContext,
  ): Promise<RouteAlternativeDto> {
    // Sum up all legs (for multi-waypoint routes)
    let totalDistanceM = 0;
    let totalDurationS = 0;
    let totalTrafficDurationS = 0;

    for (const leg of googleRoute.legs) {
      totalDistanceM += leg.distance.value;
      totalDurationS += leg.duration.value;
      // Use traffic-aware duration when available
      totalTrafficDurationS += (leg.duration_in_traffic?.value || leg.duration.value);
    }

    const totalDistanceKm = totalDistanceM / 1000;
    const drivingDurationMinutes = totalTrafficDurationS / 60;
    
    // Apply driving mode multiplier to energy consumption
    const modeMultiplier = DRIVING_MODE_MULTIPLIERS[drivingMode] || 1.0;
    const adjustedConsumption =
      (vehicle.averageConsumption || 180) * modeMultiplier * energyAdjustment.multiplier;

    // Calculate usable range with safety buffer
    const usableRange = this.calculateUsableRange(
      vehicle.batteryCapacity,
      currentBatteryPercent,
      adjustedConsumption,
    );

    this.logger.log(`Route ${routeNumber}: ${totalDistanceKm.toFixed(1)}km, Range: ${usableRange.toFixed(1)}km, Mode: ${drivingMode}`);

    // Determine if charging is needed
    const needsCharging = totalDistanceKm > usableRange;

    let chargingStops: ChargerStopDto[] = [];
    let totalChargingTime = 0;
    let safetyWarnings: SafetyWarningDto[] = [];
    let finalBatteryPercent = currentBatteryPercent;

    if (needsCharging) {
      const result = await this.findOptimalChargingStops(
        googleRoute,
        vehicle,
        currentBatteryPercent,
        totalDistanceKm,
        startLat,
        startLng,
        adjustedConsumption,
        preferredNetworks,
        excludedNetworks,
        minChargeAtChargingStationPercent,
        targetBatteryPercent,
      );

      chargingStops = result.stops;
      totalChargingTime = result.totalChargingTime;
      safetyWarnings = result.warnings;
      finalBatteryPercent = result.finalBatteryPercent;
    } else {
      // Calculate arrival battery
      const energyUsedKwh = (totalDistanceKm * adjustedConsumption) / 1000;
      finalBatteryPercent = currentBatteryPercent - (energyUsedKwh / vehicle.batteryCapacity) * 100;

      if (finalBatteryPercent < 20) {
        safetyWarnings.push({
          type: 'low_battery',
          severity: finalBatteryPercent < 10 ? 'high' : 'medium',
          message: `You'll arrive with approximately ${Math.round(finalBatteryPercent)}% battery. Consider charging before the trip.`,
        });
      }
    }

    // Traffic warning if traffic adds > 20% delay
    if (totalTrafficDurationS > totalDurationS * 1.2) {
      const delayMinutes = Math.round((totalTrafficDurationS - totalDurationS) / 60);
      safetyWarnings.push({
        type: 'traffic',
        severity: delayMinutes > 30 ? 'high' : 'medium',
        message: `Heavy traffic detected. Estimated ${delayMinutes} min delay. Extra energy may be consumed in stop-and-go conditions.`,
      });
    }

    if (energyAdjustment.multiplier > 1.06) {
      const percent = Math.round((energyAdjustment.multiplier - 1) * 100);
      safetyWarnings.push({
        type: 'weather',
        severity: percent >= 15 ? 'high' : 'medium',
        message: `Energy demand is adjusted by +${percent}% due to weather/elevation/HVAC conditions.`,
      });
    }

    // Objective-based route scoring for faster/cheaper/balanced planning behavior.
    const totalChargingCostLkr = chargingStops.reduce((sum, s) => sum + s.estimatedCostLkr, 0);
    const uncertaintyPenalty = this.calculateUncertaintyPenalty(
      safetyWarnings,
      chargingStops,
      energyAdjustment,
    );
    const routeScore = this.calculateRouteScore(
      routeObjective,
      drivingDurationMinutes,
      totalChargingTime,
      chargingStops.length,
      totalDistanceKm,
      totalChargingCostLkr,
      uncertaintyPenalty,
    );

    const totalDuration = drivingDurationMinutes + totalChargingTime;
    const etaConfidencePercent = this.calculateEtaConfidencePercent(
      safetyWarnings,
      chargingStops,
      drivingDurationMinutes,
    );
    const socConfidencePercent = this.calculateSocConfidencePercent(
      safetyWarnings,
      chargingStops,
      energyAdjustment,
      finalBatteryPercent,
    );

    return {
      routeNumber,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationMinutes: Math.round(totalDuration),
      drivingDurationMinutes: Math.round(drivingDurationMinutes),
      totalChargingTimeMinutes: Math.round(totalChargingTime),
      totalChargingCostLkr: Math.round(totalChargingCostLkr),
      estimatedArrivalTime: new Date(Date.now() + totalDuration * 60000).toISOString(),
      chargingStops,
      routeScore: Math.round(routeScore),
      routePolyline: googleRoute.overview_polyline?.points || '',
      routeSummary: googleRoute.summary || 'Route via main roads',
      isRecommended: false,
      safetyWarnings,
      drivingMode,
      arrivalBatteryPercent: Math.round(Math.max(0, finalBatteryPercent)),
      energyAdjustmentPercent: Math.max(0, (energyAdjustment.multiplier - 1) * 100),
      weatherPenaltyPercent: Math.max(0, energyAdjustment.weatherPenalty * 100),
      elevationPenaltyPercent: energyAdjustment.elevationPenalty * 100,
      hvacPenaltyPercent: Math.max(0, energyAdjustment.hvacPenalty * 100),
      etaConfidencePercent,
      socConfidencePercent,
    };
  }

  private calculateEtaConfidencePercent(
    warnings: SafetyWarningDto[],
    stops: ChargerStopDto[],
    drivingDurationMinutes: number,
  ): number {
    let score = 92;

    const hasTrafficWarning = warnings.some(w => w.type === 'traffic');
    const hasAvailabilityRisk = warnings.some(w => w.type === 'charger_availability_risk');
    const hasManyStops = warnings.some(w => w.type === 'many_stops');

    if (hasTrafficWarning) score -= 8;
    if (hasAvailabilityRisk) score -= 10;
    if (hasManyStops) score -= 4;

    score -= Math.min(stops.length * 2, 10);

    if (stops.length > 0) {
      const avgReliability =
        stops.reduce((sum, stop) => sum + (stop.reliabilityScore || 0.0), 0) / stops.length;

      if (avgReliability < 0.8) score -= 8;
      else if (avgReliability < 0.9) score -= 4;
      else score += 2;
    }

    if (drivingDurationMinutes > 240) score -= 3;
    if (drivingDurationMinutes > 360) score -= 3;

    return Math.max(55, Math.min(98, Math.round(score)));
  }

  private calculateSocConfidencePercent(
    warnings: SafetyWarningDto[],
    stops: ChargerStopDto[],
    energyAdjustment: EnergyAdjustmentContext,
    finalBatteryPercent: number,
  ): number {
    let score = 90;

    const hasAvailabilityRisk = warnings.some(w => w.type === 'charger_availability_risk');
    const lowBatteryWarning = warnings.find(w => w.type === 'low_battery');
    const energyAdjustmentPercent = Math.max(0, (energyAdjustment.multiplier - 1) * 100);

    score -= Math.min(energyAdjustmentPercent * 0.6, 18);
    score -= Math.min(stops.length * 1.5, 8);

    if (hasAvailabilityRisk) score -= 10;
    if (lowBatteryWarning?.severity === 'high') score -= 10;
    if (lowBatteryWarning?.severity === 'medium') score -= 6;

    if (stops.length > 0) {
      const avgReliability =
        stops.reduce((sum, stop) => sum + (stop.reliabilityScore || 0.0), 0) / stops.length;

      if (avgReliability < 0.8) score -= 8;
      else if (avgReliability >= 0.92) score += 3;
    }

    if (finalBatteryPercent < 15) score -= 8;
    else if (finalBatteryPercent > 30) score += 2;

    return Math.max(45, Math.min(97, Math.round(score)));
  }

  private calculateRouteScore(
    routeObjective: RouteObjective,
    drivingDurationMinutes: number,
    totalChargingTimeMinutes: number,
    numberOfStops: number,
    totalDistanceKm: number,
    totalChargingCostLkr: number,
    uncertaintyPenalty: number,
  ): number {
    const costInHundreds = totalChargingCostLkr / 100;
    const stopPenalty = numberOfStops * 20;

    switch (routeObjective) {
      case RouteObjective.FASTEST:
        return (
          drivingDurationMinutes * 0.55 +
          totalChargingTimeMinutes * 0.30 +
          stopPenalty * 0.10 +
          totalDistanceKm * 0.05 +
          uncertaintyPenalty
        );
      case RouteObjective.CHEAPEST:
        return (
          costInHundreds * 0.45 +
          totalChargingTimeMinutes * 0.20 +
          stopPenalty * 0.20 +
          drivingDurationMinutes * 0.10 +
          totalDistanceKm * 0.05 +
          uncertaintyPenalty
        );
      case RouteObjective.BALANCED:
      default:
        return (
          drivingDurationMinutes * 0.35 +
          totalChargingTimeMinutes * 0.25 +
          stopPenalty * 0.20 +
          totalDistanceKm * 0.10 +
          costInHundreds * 0.10 +
          uncertaintyPenalty
        );
    }
  }

  private calculateUncertaintyPenalty(
    warnings: SafetyWarningDto[],
    stops: ChargerStopDto[],
    energyAdjustment: EnergyAdjustmentContext,
  ): number {
    let penalty = 0;

    const hasAvailabilityRisk = warnings.some(w => w.type === 'charger_availability_risk');
    const hasNoChargerWarning = warnings.some(w => w.type === 'no_chargers');

    if (hasAvailabilityRisk) penalty += 14;
    if (hasNoChargerWarning) penalty += 22;

    const adjustmentPercent = Math.max(0, (energyAdjustment.multiplier - 1) * 100);
    penalty += Math.min(adjustmentPercent * 0.4, 10);

    if (stops.length > 0) {
      const avgReliability =
        stops.reduce((sum, stop) => sum + (stop.reliabilityScore || 0.0), 0) / stops.length;
      if (avgReliability < 0.8) penalty += 10;
      else if (avgReliability < 0.9) penalty += 5;
    }

    return penalty;
  }

  /**
   * Calculate usable range with safety buffer
   */
  private calculateUsableRange(
    batteryCapacityKwh: number,
    batteryPercent: number,
    avgConsumptionWhPerKm: number,
  ): number {
    const usableEnergyKwh = (batteryCapacityKwh * batteryPercent) / 100;
    const theoreticalRange = usableEnergyKwh / (avgConsumptionWhPerKm / 1000);
    return theoreticalRange * this.SAFETY_BUFFER;
  }

  /**
   * Find optimal charging stops along the route
   */
  private async findOptimalChargingStops(
    googleRoute: any,
    vehicle: VehicleProfile,
    initialBatteryPercent: number,
    totalDistanceKm: number,
    startLat: number,
    startLng: number,
    adjustedConsumption: number,
    preferredNetworks: string[],
    excludedNetworks: string[],
    minChargeAtChargingStationPercent: number,
    targetBatteryPercent: number,
  ): Promise<{ stops: ChargerStopDto[], totalChargingTime: number, warnings: SafetyWarningDto[], finalBatteryPercent: number }> {
    const pathPoints = this.decodePolyline(googleRoute.overview_polyline?.points || '');
    const segments = this.createRouteSegments(pathPoints, this.ROUTE_SEGMENT_LENGTH);

    let currentBatteryKwh = (vehicle.batteryCapacity * initialBatteryPercent) / 100;
    let distanceTraveled = 0;
    const stops: ChargerStopDto[] = [];
    const warnings: SafetyWarningDto[] = [];
    let preferredFallbackUsed = false;
    let availabilityFallbackUsed = false;

    // Pre-load chargers within a bounding box of the route to avoid repeated DB queries
    const routeChargers = await this.loadChargersAlongRoute(pathPoints, this.CHARGER_SEARCH_RADIUS);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Energy consumed for this segment (Wh → kWh)
      const energyNeededKwh = (segment.distance * adjustedConsumption) / 1000;
      currentBatteryKwh -= energyNeededKwh;
      distanceTraveled += segment.distance;

      const currentBatteryPercent = (currentBatteryKwh / vehicle.batteryCapacity) * 100;

      // Check if we need to charge (below minimum threshold)
      if (currentBatteryPercent < minChargeAtChargingStationPercent) {
        // Filter pre-loaded chargers by proximity to segment endpoint
        const nearbyChargers = this.filterNearbyCompatibleChargers(
          routeChargers,
          segment.endLat,
          segment.endLng,
          vehicle.connectorType,
          this.CHARGER_SEARCH_RADIUS,
          excludedNetworks,
        );

        const usableChargers = this.filterPreferredNetworkChargers(
          nearbyChargers,
          preferredNetworks,
        );

        if (preferredNetworks.length > 0 &&
            usableChargers.length === nearbyChargers.length &&
            nearbyChargers.some(charger => !this.matchesAnyNetworkKeyword(charger, preferredNetworks))) {
          preferredFallbackUsed = true;
        }

        if (usableChargers.length === 0) {
          warnings.push({
            type: 'no_chargers',
            severity: 'high',
            message: `Warning: Long stretch without available chargers (around ${Math.round(distanceTraveled)}km). Plan alternative route or charge before departure.`,
          });
          continue;
        }

        // Select best charger and keep ranked backups for resiliency.
        const rankedChargers = this.rankChargersForStop(usableChargers, segment.endLat, segment.endLng);
        const bestCharger = rankedChargers[0];
        const backupChargerNames = rankedChargers
          .slice(1)
          .filter(charger => this.getAvailabilityQuality(charger) >= 0.5)
          .slice(0, 2)
          .map(charger => charger.name || 'Alternative charger');
        const availabilityConfidencePercent = Math.round(
          Math.max(35, Math.min(96, this.getAvailabilityQuality(bestCharger) * 100)),
        );

        if (!this.isHighAvailabilityCharger(bestCharger)) {
          availabilityFallbackUsed = true;
        }

        // Calculate charging with non-linear curve
        const targetBatteryKwh = vehicle.batteryCapacity * (targetBatteryPercent / 100);
        const energyToChargeKwh = targetBatteryKwh - currentBatteryKwh;

        const chargingPowerKw = this.getEffectiveChargingPower(bestCharger, vehicle);
        const chargingTimeMinutes = this.calculateChargingTime(
          vehicle,
          currentBatteryPercent,
          targetBatteryPercent,
          chargingPowerKw,
        );

        const arrivalPercent = Math.max(0, Math.round(currentBatteryPercent));

        stops.push({
          chargerId: bestCharger.id,
          chargerName: bestCharger.name || 'Charging Station',
          location: {
            lat: Number(bestCharger.lat),
            lng: Number(bestCharger.lng),
            address: bestCharger.address,
          },
          googleMapUrl: bestCharger.googleMapUrl || `https://www.google.com/maps?q=${bestCharger.lat},${bestCharger.lng}`,
          distanceFromStart: Math.round(distanceTraveled * 10) / 10,
          arrivalBatteryPercent: arrivalPercent,
          departureBatteryPercent: targetBatteryPercent,
          chargingTimeMinutes: Math.round(chargingTimeMinutes),
          chargingPowerKw,
          estimatedCostLkr: Math.round(energyToChargeKwh * (Number(bestCharger.pricePerKwh) || 35)),
          connectorType: bestCharger.connectorType || vehicle.connectorType,
          reliabilityScore: Number(bestCharger.reliabilityScore) || 0.95,
          chargerType: bestCharger.chargerType || 'dc',
          backupChargerNames,
          availabilityConfidencePercent,
        });

        // Update battery after charging
        currentBatteryKwh = targetBatteryKwh;
      }
    }

    // Check if we have too many stops
    if (stops.length > 3) {
      warnings.push({
        type: 'many_stops',
        severity: 'medium',
        message: `This route requires ${stops.length} charging stops. Consider starting with a higher battery level or choosing a different route.`,
      });
    }

    if (preferredFallbackUsed) {
      warnings.push({
        type: 'charger_preference_fallback',
        severity: 'low',
        message: 'Preferred charging networks were not consistently available on this route. Alternatives were used where needed.',
      });
    }

    if (availabilityFallbackUsed) {
      warnings.push({
        type: 'charger_availability_risk',
        severity: 'medium',
        message: 'Some selected charging stops may have lower real-time availability. Consider backup stations along the route.',
      });
    }

    const totalChargingTime = stops.reduce((sum, stop) => sum + stop.chargingTimeMinutes, 0);
    const finalBatteryPercent = (currentBatteryKwh / vehicle.batteryCapacity) * 100;

    return { stops, totalChargingTime, warnings, finalBatteryPercent };
  }

  /**
   * Pre-load chargers along the route using bounding box query
   * instead of loading ALL chargers from the DB
   */
  private async loadChargersAlongRoute(
    pathPoints: Array<{ lat: number; lng: number }>,
    bufferKm: number,
  ): Promise<Charger[]> {
    if (pathPoints.length === 0) return [];

    // Calculate bounding box of the entire route with buffer
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const p of pathPoints) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }

    // Add buffer (~0.09° per 10km at equator; Sri Lanka ~7°N)
    const latBuffer = bufferKm / 111.0;
    const lngBuffer = bufferKm / (111.0 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));

    try {
      // Use query builder for spatial bounding box
      const chargers = await this.chargerRepository
        .createQueryBuilder('charger')
        .where('charger.verified = :verified', { verified: true })
        .andWhere('charger.lat BETWEEN :minLat AND :maxLat', {
          minLat: minLat - latBuffer,
          maxLat: maxLat + latBuffer,
        })
        .andWhere('charger.lng BETWEEN :minLng AND :maxLng', {
          minLng: minLng - lngBuffer,
          maxLng: maxLng + lngBuffer,
        })
        .getMany();

      this.logger.log(`Loaded ${chargers.length} chargers within route bounding box`);
      return chargers;
    } catch (error) {
      this.logger.error(`Error loading chargers: ${error.message}`);
      // Fallback to loading all verified chargers
      return this.chargerRepository.find({ where: { verified: true } });
    }
  }

  /**
   * Filter pre-loaded chargers by proximity and connector compatibility
   */
  private filterNearbyCompatibleChargers(
    allChargers: Charger[],
    lat: number,
    lng: number,
    vehicleConnector: string,
    radiusKm: number,
    excludedNetworks: string[] = [],
  ): Charger[] {
    return allChargers.filter(charger => {
      if (this.matchesAnyNetworkKeyword(charger, excludedNetworks)) return false;

      const availabilityQuality = this.getAvailabilityQuality(charger);
      if (availabilityQuality < 0.25) return false;

      const distance = this.calculateHaversineDistance(lat, lng, Number(charger.lat), Number(charger.lng));
      if (distance > radiusKm) return false;

      return this.isConnectorCompatible(charger.connectorType, vehicleConnector);
    });
  }

  private filterPreferredNetworkChargers(
    chargers: Charger[],
    preferredNetworks: string[],
  ): Charger[] {
    if (preferredNetworks.length === 0) return chargers;

    const preferred = chargers.filter(charger =>
      this.matchesAnyNetworkKeyword(charger, preferredNetworks),
    );

    return preferred.length > 0 ? preferred : chargers;
  }

  private normalizeNetworkKeywords(values?: string[]): string[] {
    if (!values || values.length === 0) return [];

    const normalized = values
      .map(value => value.trim().toLowerCase())
      .filter(value => value.length > 0);

    return [...new Set(normalized)];
  }

  private async buildEnergyAdjustmentContext(
    dto: SmartTripPlanDto,
  ): Promise<EnergyAdjustmentContext> {
    const weather = await this.resolveWeatherInputs(dto);

    let weatherPenalty = 0;
    if (weather.temperatureC < 18) {
      weatherPenalty += Math.min((18 - weather.temperatureC) * 0.006, 0.15);
    } else if (weather.temperatureC > 30) {
      weatherPenalty += Math.min((weather.temperatureC - 30) * 0.004, 0.08);
    }
    weatherPenalty += Math.min(weather.windSpeedKph * 0.0015, 0.08);

    const elevationPenalty = this.calculateElevationPenalty(dto.elevationDeltaM);
    const hvacPenalty = Math.min((dto.hvacLoadKw ?? 0.0) * 0.02, 0.08);
    const multiplier = Math.max(0.85, 1 + weatherPenalty + elevationPenalty + hvacPenalty);

    return {
      multiplier,
      weatherPenalty,
      elevationPenalty,
      hvacPenalty,
    };
  }

  private calculateElevationPenalty(elevationDeltaM?: number): number {
    if (elevationDeltaM == null) return 0;

    if (elevationDeltaM > 0) {
      return Math.min((elevationDeltaM / 1000) * 0.12, 0.12);
    }

    return -Math.min((Math.abs(elevationDeltaM) / 1000) * 0.05, 0.05);
  }

  private async resolveWeatherInputs(
    dto: SmartTripPlanDto,
  ): Promise<{ temperatureC: number; windSpeedKph: number }> {
    if (dto.ambientTemperatureC != null || dto.windSpeedKph != null) {
      return {
        temperatureC: dto.ambientTemperatureC ?? 28,
        windSpeedKph: dto.windSpeedKph ?? 0,
      };
    }

    // Best-effort weather lookup from Open-Meteo at route midpoint.
    const midLat = (dto.startLat + dto.destLat) / 2;
    const midLng = (dto.startLng + dto.destLng) / 2;

    try {
      const url = 'https://api.open-meteo.com/v1/forecast';
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            latitude: midLat,
            longitude: midLng,
            current: 'temperature_2m,wind_speed_10m',
            timezone: 'auto',
          },
          timeout: 2500,
        }),
      );

      const current = response.data?.current;
      const temperatureC = Number(current?.temperature_2m);
      const windSpeedKph = Number(current?.wind_speed_10m);

      if (Number.isFinite(temperatureC) && Number.isFinite(windSpeedKph)) {
        return { temperatureC, windSpeedKph };
      }
    } catch (_) {
      // Keep defaults when live weather lookup is unavailable.
    }

    return { temperatureC: 28, windSpeedKph: 0 };
  }

  private matchesAnyNetworkKeyword(charger: Charger, keywords: string[]): boolean {
    if (keywords.length === 0) return false;

    const searchText = `${charger.name || ''} ${charger.address || ''}`.toLowerCase();
    return keywords.some(keyword => searchText.includes(keyword));
  }

  /**
   * Check if charger connector is compatible with vehicle
   */
  private isConnectorCompatible(chargerConnector: string | null, vehicleConnector: string): boolean {
    if (!chargerConnector) return false;

    const vehicleConnectors = vehicleConnector.toLowerCase().split(',').map(c => c.trim());
    const chargerConn = chargerConnector.toLowerCase();

    return vehicleConnectors.some(vc => 
      vc.includes(chargerConn) || chargerConn.includes(vc)
    );
  }

  /**
   * Select best charger from candidates
   * Weighted blend of distance, power, reliability, and live availability quality.
   */
  private rankChargersForStop(chargers: Charger[], targetLat: number, targetLng: number): Charger[] {
    return [...chargers].sort((a, b) => {
      const distA = this.calculateHaversineDistance(targetLat, targetLng, Number(a.lat), Number(a.lng));
      const distB = this.calculateHaversineDistance(targetLat, targetLng, Number(b.lat), Number(b.lng));
      
      const powerA = Number(a.maxPowerKw) || 0;
      const powerB = Number(b.maxPowerKw) || 0;

      const reliabilityA = Number(a.reliabilityScore) || 0.85;
      const reliabilityB = Number(b.reliabilityScore) || 0.85;
      const availabilityA = this.getAvailabilityQuality(a);
      const availabilityB = this.getAvailabilityQuality(b);

      // Normalized score (lower = better)
      const maxDist = Math.max(distA, distB, 1);
      const maxPower = Math.max(powerA, powerB, 1);

      const scoreA = 
        (distA / maxDist) * 0.30 + 
        (1 - powerA / maxPower) * 0.25 + 
        (1 - reliabilityA) * 0.20 +
        (1 - availabilityA) * 0.25;
      const scoreB = 
        (distB / maxDist) * 0.30 + 
        (1 - powerB / maxPower) * 0.25 + 
        (1 - reliabilityB) * 0.20 +
        (1 - availabilityB) * 0.25;

      return scoreA - scoreB;
    });
  }

  private isHighAvailabilityCharger(charger: Charger): boolean {
    return this.getAvailabilityQuality(charger) >= 0.65;
  }

  private getAvailabilityQuality(charger: Charger): number {
    const status = (charger.status || '').toLowerCase();
    const currentStatus = (charger.currentStatus || '').toLowerCase();

    const statusScore =
      status === 'available' ? 1.0 :
      status === 'in-use' ? 0.6 :
      status === 'offline' ? 0.1 : 0.75;

    const currentStatusScore =
      currentStatus === 'available' ? 1.0 :
      currentStatus === 'occupied' ? 0.6 :
      currentStatus === 'reserved' ? 0.55 :
      currentStatus === 'maintenance' ? 0.1 :
      currentStatus === 'offline' ? 0.1 : 0.75;

    const onlineScore = charger.isOnline ? 1.0 : 0.65;

    const heartbeatScore = (() => {
      if (!charger.lastHeartbeat) return 0.75;
      const ageMs = Date.now() - new Date(charger.lastHeartbeat).getTime();
      return ageMs <= 15 * 60 * 1000 ? 1.0 : 0.75;
    })();

    const baseScore =
      statusScore * 0.40 +
      currentStatusScore * 0.30 +
      onlineScore * 0.20 +
      heartbeatScore * 0.10;

    return charger.manualOverride ? baseScore * 0.9 : baseScore;
  }

  /**
   * Calculate charging time using non-linear charging curve
   * Fast charging to ~80%, then significant taper
   */
  private calculateChargingTime(
    vehicle: VehicleProfile,
    fromPercent: number,
    toPercent: number,
    maxChargingPowerKw: number,
  ): number {
    const curve = vehicle.chargingCurve && vehicle.chargingCurve.length > 0
      ? vehicle.chargingCurve.map(p => ({ percentage: p.percentage, factor: p.powerKw / maxChargingPowerKw }))
      : DEFAULT_CHARGING_CURVE;

    const steps = 20; // Calculate in 20 steps for accuracy
    const percentPerStep = (toPercent - fromPercent) / steps;
    let totalTimeMinutes = 0;

    for (let i = 0; i < steps; i++) {
      const currentPercent = fromPercent + (i * percentPerStep);
      
      // Interpolate charging factor from curve
      const factor = this.interpolateChargingFactor(curve, currentPercent);
      const effectivePower = maxChargingPowerKw * factor;

      // Energy for this step
      const energyKwh = (vehicle.batteryCapacity * percentPerStep) / 100;
      
      if (effectivePower > 0) {
        totalTimeMinutes += (energyKwh / effectivePower) * 60;
      }
    }

    return totalTimeMinutes;
  }

  /**
   * Interpolate charging factor from charging curve
   */
  private interpolateChargingFactor(
    curve: Array<{ percentage: number; factor: number }>,
    percent: number,
  ): number {
    if (curve.length === 0) return 1.0;

    // Find surrounding points
    let lower = curve[0];
    let upper = curve[curve.length - 1];

    for (let i = 0; i < curve.length - 1; i++) {
      if (percent >= curve[i].percentage && percent <= curve[i + 1].percentage) {
        lower = curve[i];
        upper = curve[i + 1];
        break;
      }
    }

    if (lower.percentage === upper.percentage) return lower.factor;

    // Linear interpolation
    const t = (percent - lower.percentage) / (upper.percentage - lower.percentage);
    return lower.factor + t * (upper.factor - lower.factor);
  }

  /**
   * Get effective charging power based on charger and vehicle capabilities
   */
  private getEffectiveChargingPower(charger: Charger, vehicle: VehicleProfile): number {
    const chargerPower = Number(charger.maxPowerKw) || 50;
    
    // Use vehicle's actual AC/DC limits
    let vehicleMaxPower: number;
    if (charger.chargerType === 'ac') {
      vehicleMaxPower = Number(vehicle.maxAcChargingPower) || 11;
    } else {
      vehicleMaxPower = Number(vehicle.maxDcChargingPower) || 50;
    }

    return Math.min(chargerPower, vehicleMaxPower);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Decode Google Maps polyline
   */
  private decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
    if (!encoded) return [];

    const points: Array<{ lat: number; lng: number }> = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return points;
  }

  /**
   * Create route segments from polyline points
   */
  private createRouteSegments(points: Array<{ lat: number; lng: number }>, segmentLengthKm: number): RouteSegment[] {
    if (points.length < 2) return [];

    const segments: RouteSegment[] = [];
    let currentSegmentStart = points[0];
    let accumulatedDistance = 0;

    for (let i = 1; i < points.length; i++) {
      const segmentDistance = this.calculateHaversineDistance(
        points[i - 1].lat,
        points[i - 1].lng,
        points[i].lat,
        points[i].lng,
      );

      accumulatedDistance += segmentDistance;

      if (accumulatedDistance >= segmentLengthKm || i === points.length - 1) {
        segments.push({
          startLat: currentSegmentStart.lat,
          startLng: currentSegmentStart.lng,
          endLat: points[i].lat,
          endLng: points[i].lng,
          distance: accumulatedDistance,
          duration: (accumulatedDistance / 60) * 60,
        });

        currentSegmentStart = points[i];
        accumulatedDistance = 0;
      }
    }

    return segments;
  }
}
