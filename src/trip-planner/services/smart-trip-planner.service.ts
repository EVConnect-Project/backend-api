import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charger } from '../../charger/entities/charger.entity';
import { VehicleProfile } from '../../auth/entities/vehicle-profile.entity';
import { SmartTripPlanDto } from '../dto/smart-trip-plan.dto';
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

@Injectable()
export class SmartTripPlannerService {
  private readonly logger = new Logger(SmartTripPlannerService.name);
  private readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
  private readonly SAFETY_BUFFER = 0.8; // 20% reserve
  private readonly CHARGER_SEARCH_RADIUS = 7.5; // km (average of 5-10km)
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

    // 2. Get Google Maps route alternatives (up to 3)
    const googleRoutes = await this.getGoogleDirections(
      dto.startLat,
      dto.startLng,
      dto.destLat,
      dto.destLng,
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
   * Get route alternatives from Google Directions API
   */
  private async getGoogleDirections(
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number,
  ): Promise<any[]> {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json`;
      const params = {
        origin: `${startLat},${startLng}`,
        destination: `${destLat},${destLng}`,
        alternatives: 'true', // Request alternative routes
        mode: 'driving',
        traffic_model: 'best_guess',
        departure_time: 'now',
        key: this.GOOGLE_MAPS_API_KEY,
      };

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
  ): Promise<RouteAlternativeDto> {
    const leg = googleRoute.legs[0];
    const totalDistanceKm = leg.distance.value / 1000;
    const baseDurationMinutes = leg.duration.value / 60;
    
    // Calculate usable range with safety buffer
    const usableRange = this.calculateUsableRange(
      vehicle.batteryCapacity,
      currentBatteryPercent,
      vehicle.averageConsumption || 180, // Default 180 Wh/km
    );

    this.logger.log(`Route ${routeNumber}: ${totalDistanceKm}km, Usable range: ${usableRange}km`);

    // Determine if charging is needed
    const needsCharging = totalDistanceKm > usableRange;

    let chargingStops: ChargerStopDto[] = [];
    let totalChargingTime = 0;
    let safetyWarnings: SafetyWarningDto[] = [];

    if (needsCharging) {
      // Find optimal charging stops along the route
      const result = await this.findOptimalChargingStops(
        googleRoute,
        vehicle,
        currentBatteryPercent,
        totalDistanceKm,
        startLat,
        startLng,
      );

      chargingStops = result.stops;
      totalChargingTime = result.totalChargingTime;
      safetyWarnings = result.warnings;
    } else {
      // Check if battery will be critically low at destination
      const arrivalBatteryPercent = currentBatteryPercent - 
        (totalDistanceKm * (vehicle.averageConsumption || 180) / 1000 / vehicle.batteryCapacity) * 100;

      if (arrivalBatteryPercent < 30) {
        safetyWarnings.push({
          type: 'low_battery',
          severity: 'medium',
          message: `You'll arrive with approximately ${Math.round(arrivalBatteryPercent)}% battery. Consider charging before the trip.`,
        });
      }
    }

    // Calculate route score: (travel_time × 0.5) + (charging_time × 0.3) + (stops × 0.2)
    const routeScore = 
      (baseDurationMinutes * 0.5) + 
      (totalChargingTime * 0.3) + 
      (chargingStops.length * 20 * 0.2); // 20 minutes weight per stop

    const totalDuration = baseDurationMinutes + totalChargingTime;

    return {
      routeNumber,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationMinutes: Math.round(totalDuration),
      estimatedArrivalTime: new Date(Date.now() + totalDuration * 60000).toISOString(),
      chargingStops,
      routeScore: Math.round(routeScore),
      routePolyline: googleRoute.overview_polyline?.points || '',
      routeSummary: googleRoute.summary || 'Route via main roads',
      isRecommended: false,
      safetyWarnings,
    };
  }

  /**
   * Calculate usable range with safety buffer
   * Formula: (battery_capacity * battery_percentage / 100) / (avg_consumption / 1000) * 0.8
   */
  private calculateUsableRange(
    batteryCapacityKwh: number,
    batteryPercent: number,
    avgConsumptionWhPerKm: number,
  ): number {
    const usableEnergyKwh = (batteryCapacityKwh * batteryPercent) / 100;
    const theoreticalRange = usableEnergyKwh / (avgConsumptionWhPerKm / 1000);
    return theoreticalRange * this.SAFETY_BUFFER; // Apply 20% safety buffer
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
  ): Promise<{ stops: ChargerStopDto[], totalChargingTime: number, warnings: SafetyWarningDto[] }> {
    // Decode route polyline to get path points
    const pathPoints = this.decodePolyline(googleRoute.overview_polyline?.points || '');
    
    // Create route segments every 25km
    const segments = this.createRouteSegments(pathPoints, this.ROUTE_SEGMENT_LENGTH);

    let currentBatteryKwh = (vehicle.batteryCapacity * initialBatteryPercent) / 100;
    let distanceTraveled = 0;
    const stops: ChargerStopDto[] = [];
    const warnings: SafetyWarningDto[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Calculate energy consumption for this segment
      const energyNeededKwh = (segment.distance * (vehicle.averageConsumption || 180)) / 1000000; // Wh to kWh
      currentBatteryKwh -= energyNeededKwh;
      distanceTraveled += segment.distance;

      const currentBatteryPercent = (currentBatteryKwh / vehicle.batteryCapacity) * 100;

      // Check if we need to charge
      if (currentBatteryPercent < this.MIN_BATTERY_THRESHOLD) {
        // Find nearby chargers
        const nearbyChargers = await this.findNearbyCompatibleChargers(
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

        // Select best charger (closest, highest power, best reliability)
        const bestCharger = this.selectBestCharger(nearbyChargers, segment.endLat, segment.endLng);

        // Calculate charging needed (charge to 80% target)
        const targetBatteryKwh = vehicle.batteryCapacity * 0.8;
        const energyToChargeKwh = targetBatteryKwh - currentBatteryKwh;

        // Calculate charging time
        const chargingPowerKw = this.getEffectiveChargingPower(bestCharger, vehicle);
        const chargingTimeMinutes = (energyToChargeKwh / chargingPowerKw) * 60;

        stops.push({
          chargerId: bestCharger.id,
          chargerName: bestCharger.name || 'Charging Station',
          location: {
            lat: bestCharger.lat,
            lng: bestCharger.lng,
            address: bestCharger.address,
          },
          googleMapUrl: bestCharger.googleMapUrl || `https://www.google.com/maps?q=${bestCharger.lat},${bestCharger.lng}`,
          distanceFromStart: Math.round(distanceTraveled * 10) / 10,
          arrivalBatteryPercent: Math.round(currentBatteryPercent),
          departureBatteryPercent: 80,
          chargingTimeMinutes: Math.round(chargingTimeMinutes),
          chargingPowerKw: chargingPowerKw,
          estimatedCostLkr: Math.round(energyToChargeKwh * bestCharger.pricePerKwh),
          connectorType: bestCharger.connectorType || vehicle.connectorType,
          reliabilityScore: bestCharger.reliabilityScore,
        });

        // Update battery to 80% after charging
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

    return { stops, totalChargingTime, warnings };
  }

  /**
   * Find chargers near a location that match the vehicle's connector
   */
  private async findNearbyCompatibleChargers(
    lat: number,
    lng: number,
    vehicleConnector: string,
    radiusKm: number,
  ): Promise<Charger[]> {
    // Query chargers within radius using Haversine formula
    // This is a simplified version - in production use PostGIS spatial queries
    const allChargers = await this.chargerRepository.find({
      where: {
        status: 'available',
        verified: true,
      },
    });

    const nearbyChargers = allChargers.filter(charger => {
      const distance = this.calculateHaversineDistance(lat, lng, Number(charger.lat), Number(charger.lng));
      if (distance > radiusKm) return false;

      // Check connector compatibility
      return this.isConnectorCompatible(charger.connectorType, vehicleConnector);
    });

    return nearbyChargers;
  }

  /**
   * Check if charger connector is compatible with vehicle
   */
  private isConnectorCompatible(chargerConnector: string | null, vehicleConnector: string): boolean {
    if (!chargerConnector) return false;

    // Parse vehicle connectors (can be comma-separated)
    const vehicleConnectors = vehicleConnector.toLowerCase().split(',').map(c => c.trim());
    const chargerConn = chargerConnector.toLowerCase();

    // Check if any vehicle connector matches
    return vehicleConnectors.some(vc => 
      vc.includes(chargerConn) || chargerConn.includes(vc)
    );
  }

  /**
   * Select best charger from candidates
   * Rank by: 1) Distance, 2) Power, 3) Reliability
   */
  private selectBestCharger(chargers: Charger[], targetLat: number, targetLng: number): Charger {
    return chargers.sort((a, b) => {
      const distA = this.calculateHaversineDistance(targetLat, targetLng, Number(a.lat), Number(a.lng));
      const distB = this.calculateHaversineDistance(targetLat, targetLng, Number(b.lat), Number(b.lng));
      
      const powerA = Number(a.powerKw) || Number(a.maxPowerKw) || 0;
      const powerB = Number(b.powerKw) || Number(b.maxPowerKw) || 0;

      const reliabilityA = Number(a.reliabilityScore) || 0.95;
      const reliabilityB = Number(b.reliabilityScore) || 0.95;

      // Weighted score: distance (40%), power (30%), reliability (30%)
      const scoreA = (distA * 0.4) + ((50 - powerA) * 0.3) + ((1 - reliabilityA) * 0.3);
      const scoreB = (distB * 0.4) + ((50 - powerB) * 0.3) + ((1 - reliabilityB) * 0.3);

      return scoreA - scoreB;
    })[0];
  }

  /**
   * Get effective charging power based on charger and vehicle capabilities
   */
  private getEffectiveChargingPower(charger: Charger, vehicle: VehicleProfile): number {
    const chargerPower = Number(charger.powerKw) || Number(charger.maxPowerKw) || 50;
    
    // Determine vehicle max power based on charger type
    let vehicleMaxPower = 50; // Default
    if (charger.chargerType === 'ac') {
      const maxAc = vehicle.maxAcChargingPower ? parseFloat(vehicle.maxAcChargingPower) : 11;
      vehicleMaxPower = maxAc;
    } else {
      const maxDc = vehicle.maxDcChargingPower ? parseFloat(vehicle.maxDcChargingPower) : 50;
      vehicleMaxPower = maxDc;
    }

    // Effective power is the minimum of charger and vehicle capability
    return Math.min(chargerPower, vehicleMaxPower);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
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
    if (points.length < 2) {
      return [];
    }

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
          duration: (accumulatedDistance / 60) * 60, // Rough estimate: 60 km/h average
        });

        currentSegmentStart = points[i];
        accumulatedDistance = 0;
      }
    }

    return segments;
  }
}
