import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Charger } from "../charger/entities/charger.entity";
import { PlanRouteDto } from "./dto/plan-route.dto";
import { RouteResponseDto, ChargingStop } from "./dto/route-response.dto";
import { VehicleSpecs } from "./interfaces/route.interface";

@Injectable()
export class TripPlannerService {
  constructor(
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
  ) {}

  async planRoute(
    planRouteDto: PlanRouteDto,
    userId: string,
  ): Promise<RouteResponseDto> {
    const {
      start,
      destination,
      currentBattery = 80,
      minBatteryAtStop = 20,
    } = planRouteDto;

    // Step 1: Geocode addresses (simplified - in production use Google Maps Geocoding API)
    const startCoords = await this.geocodeAddress(start);
    const endCoords = await this.geocodeAddress(destination);

    // Step 2: Calculate route distance and duration (simplified)
    const { distance, duration, polyline } = await this.calculateRoute(
      startCoords,
      endCoords,
    );

    // Step 3: Get vehicle specs (default if not provided)
    const vehicleSpecs = await this.getVehicleSpecs(planRouteDto.vehicleId);

    // Step 4: Calculate energy consumption
    const energyNeeded = this.calculateEnergyConsumption(
      distance,
      vehicleSpecs,
    );

    // Step 5: Determine if charging stops are needed
    const maxRange = (currentBattery / 100) * vehicleSpecs.rangeKm;

    const chargingStops: ChargingStop[] = [];
    let totalCost = 0;

    if (distance > maxRange) {
      // Need charging stops
      const stops = await this.calculateChargingStops(
        startCoords,
        endCoords,
        distance,
        currentBattery,
        minBatteryAtStop,
        vehicleSpecs,
      );
      chargingStops.push(...stops);
      totalCost = stops.reduce((sum, stop) => sum + stop.estimatedCost, 0);
    }

    // Step 6: Format response
    return {
      totalDistance: distance,
      estimatedTime: this.formatDuration(duration),
      totalCost,
      chargingStops,
      routePolyline: polyline,
      startLocation: {
        ...startCoords,
        address: start,
      },
      endLocation: {
        ...endCoords,
        address: destination,
      },
      energyConsumption: energyNeeded,
      recommendedDepartureBattery: this.calculateRecommendedBattery(
        distance,
        vehicleSpecs,
      ),
    };
  }

  private async geocodeAddress(
    address: string,
  ): Promise<{ lat: number; lng: number }> {
    // Simplified geocoding - in production, use Google Maps Geocoding API
    // For now, return mock coordinates or parse if lat/lng provided

    // Check if address is already in "lat,lng" format
    const coords = address.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coords) {
      return {
        lat: parseFloat(coords[1]),
        lng: parseFloat(coords[2]),
      };
    }

    // Mock geocoding based on common locations
    const mockLocations: Record<string, { lat: number; lng: number }> = {
      colombo: { lat: 6.9271, lng: 79.8612 },
      kandy: { lat: 7.2906, lng: 80.6337 },
      galle: { lat: 6.0535, lng: 80.221 },
      jaffna: { lat: 9.6615, lng: 80.0255 },
      negombo: { lat: 7.2084, lng: 79.8358 },
    };

    const key = address.toLowerCase().trim();
    if (mockLocations[key]) {
      return mockLocations[key];
    }

    // Default location if not found
    return { lat: 6.9271, lng: 79.8612 }; // Colombo
  }

  private async calculateRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
  ): Promise<{ distance: number; duration: number; polyline: string }> {
    // Simplified route calculation using Haversine formula
    // In production, use Google Maps Directions API

    const distance = this.calculateDistance(
      start.lat,
      start.lng,
      end.lat,
      end.lng,
    );
    const avgSpeedKmh = 60; // Average speed
    const durationSeconds = (distance / avgSpeedKmh) * 3600;

    // Simple polyline (in production, get from Google Maps)
    const polyline = `${start.lat},${start.lng}|${end.lat},${end.lng}`;

    return {
      distance,
      duration: durationSeconds,
      polyline,
    };
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async getVehicleSpecs(vehicleId?: string): Promise<VehicleSpecs> {
    // In production, fetch from vehicle_profiles table
    // For now, return default Tesla Model 3 specs
    return {
      batteryCapacity: 60, // kWh
      rangeKm: 400,
      connectorType: "CCS",
      efficiencyKwhPer100km: 15, // Average consumption
    };
  }

  private calculateEnergyConsumption(
    distanceKm: number,
    specs: VehicleSpecs,
  ): number {
    return (distanceKm / 100) * specs.efficiencyKwhPer100km;
  }

  private async calculateChargingStops(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    totalDistance: number,
    currentBattery: number,
    minBattery: number,
    vehicleSpecs: VehicleSpecs,
  ): Promise<ChargingStop[]> {
    const stops: ChargingStop[] = [];

    // Calculate usable battery range
    const usableBatteryPercentage = currentBattery - minBattery;
    const maxRangeKm = (usableBatteryPercentage / 100) * vehicleSpecs.rangeKm;

    if (totalDistance <= maxRangeKm) {
      return stops; // No charging needed
    }

    // Calculate number of stops needed
    let remainingDistance = totalDistance;
    let currentPosition = start;
    let currentBatteryLevel = currentBattery;
    let distanceCovered = 0;

    while (remainingDistance > maxRangeKm) {
      // Find charger approximately at 80% of range (safety buffer)
      const targetDistance = distanceCovered + maxRangeKm * 0.8;

      // Find chargers near the route
      const nearbyChargers = await this.findChargersAlongRoute(
        start,
        end,
        targetDistance,
        totalDistance,
      );

      if (nearbyChargers.length === 0) {
        throw new BadRequestException("No charging stations found along route");
      }

      // Select best charger (highest power, lowest price, available)
      const bestCharger = this.selectBestCharger(nearbyChargers);

      // Calculate energy needed
      const distanceToCharger = this.calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        bestCharger.lat,
        bestCharger.lng,
      );

      const energyConsumed = this.calculateEnergyConsumption(
        distanceToCharger,
        vehicleSpecs,
      );
      const batteryConsumed =
        (energyConsumed / vehicleSpecs.batteryCapacity) * 100;
      const batteryOnArrival = currentBatteryLevel - batteryConsumed;

      // Charge to 80% (fast charging sweet spot)
      const targetChargeLevel = 80;
      const energyNeeded =
        ((targetChargeLevel - batteryOnArrival) / 100) *
        vehicleSpecs.batteryCapacity;
      const chargingTime = (energyNeeded / bestCharger.powerKw) * 60; // minutes
      const cost = energyNeeded * bestCharger.pricePerKwh;

      stops.push({
        chargerId: bestCharger.id,
        name: bestCharger.name || "Charging Station",
        address: bestCharger.address || "Address not available",
        lat: bestCharger.lat,
        lng: bestCharger.lng,
        powerKw: bestCharger.powerKw,
        pricePerKwh: bestCharger.pricePerKwh,
        status: bestCharger.status,
        estimatedChargingTime: Math.ceil(chargingTime),
        estimatedCost: Number(cost.toFixed(2)),
        energyNeeded: Number(energyNeeded.toFixed(2)),
        batteryOnArrival: Number(batteryOnArrival.toFixed(1)),
        batteryAfterCharging: targetChargeLevel,
        distanceFromPrevious: Number(distanceToCharger.toFixed(1)),
        isAvailable: bestCharger.status === "available",
      });

      // Update for next iteration
      currentPosition = { lat: bestCharger.lat, lng: bestCharger.lng };
      currentBatteryLevel = targetChargeLevel;
      distanceCovered = targetDistance;
      remainingDistance = totalDistance - distanceCovered;
    }

    return stops;
  }

  private async findChargersAlongRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    targetDistance: number,
    totalDistance: number,
  ): Promise<Charger[]> {
    // Calculate approximate position along route
    const ratio = targetDistance / totalDistance;
    const targetLat = start.lat + (end.lat - start.lat) * ratio;
    const targetLng = start.lng + (end.lng - start.lng) * ratio;

    // Find chargers within 20km radius of target position
    const radiusKm = 20;

    const query = `
      SELECT * FROM (
        SELECT *, 
          ( 6371 * acos( 
            cos( radians($1) ) * 
            cos( radians(CAST(lat AS FLOAT)) ) * 
            cos( radians(CAST(lng AS FLOAT)) - radians($2) ) + 
            sin( radians($1) ) * 
            sin( radians(CAST(lat AS FLOAT)) )
          ) ) AS distance
        FROM chargers
        WHERE status IN ('available', 'in-use')
      ) AS distances
      WHERE distance <= $3
      ORDER BY distance ASC
      LIMIT 10
    `;

    return this.chargerRepository.query(query, [
      targetLat,
      targetLng,
      radiusKm,
    ]);
  }

  private selectBestCharger(chargers: Charger[]): Charger {
    // Scoring system: power (40%), price (30%), availability (30%)
    let bestCharger = chargers[0];
    let bestScore = -Infinity;

    for (const charger of chargers) {
      const powerScore = Number(charger.powerKw) / 150; // Normalized to 150kW max
      const priceScore = 1 - Number(charger.pricePerKwh) / 1.0; // Lower price is better
      const availabilityScore = charger.status === "available" ? 1 : 0.5;

      const score =
        powerScore * 0.4 + priceScore * 0.3 + availabilityScore * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestCharger = charger;
      }
    }

    return bestCharger;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  private calculateRecommendedBattery(
    distance: number,
    specs: VehicleSpecs,
  ): number {
    const energyNeeded = this.calculateEnergyConsumption(distance, specs);
    const batteryPercentage = (energyNeeded / specs.batteryCapacity) * 100;

    // Add 20% safety buffer
    const recommended = Math.min(Math.ceil(batteryPercentage * 1.2), 100);
    return recommended;
  }
}
