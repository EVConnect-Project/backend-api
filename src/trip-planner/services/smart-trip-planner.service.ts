import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charger } from '../../charger/entities/charger.entity';
import { VehicleProfile } from '../../auth/entities/vehicle-profile.entity';
import { SmartTripPlanDto, DrivingMode } from '../dto/smart-trip-plan.dto';
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
  private readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
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
    const targetBattery = dto.targetBatteryPercent || 80;

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
        dto.currentBatteryPercent || 80,
        dto.startLat,
        dto.startLng,
        i + 1,
        drivingMode,
        targetBattery,
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
      return this.getFallbackRoute(startLat, startLng, destLat, destLng);
    } catch (error) {
      this.logger.error(`Error calling Google Maps API: ${error.message}`);
      return this.getFallbackRoute(startLat, startLng, destLat, destLng);
    }
  }

  /**
   * Fallback route calculation using Haversine distance
   */
  private getFallbackRoute(startLat: number, startLng: number, destLat: number, destLng: number): any[] {
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
    targetBatteryPercent: number,
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
    const adjustedConsumption = (vehicle.averageConsumption || 180) * modeMultiplier;

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

    // Route scoring: driving_time × 0.4 + charging_time × 0.3 + stops_penalty × 0.2 + distance × 0.1
    const totalChargingCostLkr = chargingStops.reduce((sum, s) => sum + s.estimatedCostLkr, 0);
    const routeScore = 
      (drivingDurationMinutes * 0.4) + 
      (totalChargingTime * 0.3) + 
      (chargingStops.length * 20 * 0.2) +
      (totalDistanceKm * 0.1);

    const totalDuration = drivingDurationMinutes + totalChargingTime;

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
    };
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
    targetBatteryPercent: number,
  ): Promise<{ stops: ChargerStopDto[], totalChargingTime: number, warnings: SafetyWarningDto[], finalBatteryPercent: number }> {
    const pathPoints = this.decodePolyline(googleRoute.overview_polyline?.points || '');
    const segments = this.createRouteSegments(pathPoints, this.ROUTE_SEGMENT_LENGTH);

    let currentBatteryKwh = (vehicle.batteryCapacity * initialBatteryPercent) / 100;
    let distanceTraveled = 0;
    const stops: ChargerStopDto[] = [];
    const warnings: SafetyWarningDto[] = [];

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
      if (currentBatteryPercent < this.MIN_BATTERY_THRESHOLD) {
        // Filter pre-loaded chargers by proximity to segment endpoint
        const nearbyChargers = this.filterNearbyCompatibleChargers(
          routeChargers,
          segment.endLat,
          segment.endLng,
          vehicle.connectorType,
          this.CHARGER_SEARCH_RADIUS,
        );

        if (nearbyChargers.length === 0) {
          warnings.push({
            type: 'no_chargers',
            severity: 'high',
            message: `Warning: Long stretch without available chargers (around ${Math.round(distanceTraveled)}km). Plan alternative route or charge before departure.`,
          });
          continue;
        }

        // Select best charger
        const bestCharger = this.selectBestCharger(nearbyChargers, segment.endLat, segment.endLng);

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
  ): Charger[] {
    return allChargers.filter(charger => {
      // Check status is available
      if (charger.status !== 'available') return false;

      const distance = this.calculateHaversineDistance(lat, lng, Number(charger.lat), Number(charger.lng));
      if (distance > radiusKm) return false;

      return this.isConnectorCompatible(charger.connectorType, vehicleConnector);
    });
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
   * Weighted: distance 35%, power 30%, reliability 25%, status 10%
   */
  private selectBestCharger(chargers: Charger[], targetLat: number, targetLng: number): Charger {
    return chargers.sort((a, b) => {
      const distA = this.calculateHaversineDistance(targetLat, targetLng, Number(a.lat), Number(a.lng));
      const distB = this.calculateHaversineDistance(targetLat, targetLng, Number(b.lat), Number(b.lng));
      
      const powerA = Number(a.maxPowerKw) || 0;
      const powerB = Number(b.maxPowerKw) || 0;

      const reliabilityA = Number(a.reliabilityScore) || 0.85;
      const reliabilityB = Number(b.reliabilityScore) || 0.85;

      // Normalized score (lower = better)
      const maxDist = Math.max(distA, distB, 1);
      const maxPower = Math.max(powerA, powerB, 1);

      const scoreA = 
        (distA / maxDist) * 0.35 + 
        (1 - powerA / maxPower) * 0.30 + 
        (1 - reliabilityA) * 0.25;
      const scoreB = 
        (distB / maxDist) * 0.35 + 
        (1 - powerB / maxPower) * 0.30 + 
        (1 - reliabilityB) * 0.25;

      return scoreA - scoreB;
    })[0];
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
