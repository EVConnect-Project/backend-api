import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { CreateTripPlanDto } from "./dto/create-trip-plan.dto";
import { TripPlanResponseDto } from "./dto/trip-plan-response.dto";

@Injectable()
export class TripService {
  private readonly AI_SERVICE_URL =
    process.env.AI_SERVICE_URL || "http://localhost:5000";

  constructor(private readonly httpService: HttpService) {}

  async createTripPlan(
    createTripPlanDto: CreateTripPlanDto,
  ): Promise<TripPlanResponseDto> {
    try {
      // Prepare request for AI service
      const aiRequest = {
        origin: createTripPlanDto.origin,
        destination: createTripPlanDto.destination,
        waypoints: createTripPlanDto.waypoints,
        vehicle_id: createTripPlanDto.vehicleId,
        battery_capacity: createTripPlanDto.batteryCapacity,
        current_battery_level: createTripPlanDto.currentBatteryLevel,
        average_consumption: createTripPlanDto.averageConsumption,
        efficiency: createTripPlanDto.efficiency,
        driving_mode: createTripPlanDto.drivingMode || "normal",
        connector_type: createTripPlanDto.connectorType,
        preferred_charger_types: createTripPlanDto.preferredChargerTypes,
        max_charging_stops: createTripPlanDto.maxChargingStops || 3,
        min_battery_threshold: createTripPlanDto.minBatteryThreshold || 20,
        target_battery_at_stop: createTripPlanDto.targetBatteryAtStop || 80,
      };

      // Call AI service
      const response = await firstValueFrom(
        this.httpService.post(`${this.AI_SERVICE_URL}/trip/plan`, aiRequest),
      );

      // Transform snake_case response to camelCase
      const tripPlan = this.transformAIResponse(response.data);

      return tripPlan;
    } catch (error) {
      console.error("Error creating trip plan:", error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "Failed to create trip plan",
          message: error.response?.data?.detail || error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private transformAIResponse(data: any): TripPlanResponseDto {
    return {
      tripId: data.trip_id,
      totalDistance: data.total_distance,
      totalDuration: data.total_duration,
      totalEnergyRequired: data.total_energy_required,
      chargingStops:
        data.charging_stops?.map((stop: any) => ({
          chargerId: stop.charger_id,
          name: stop.name,
          location: stop.location,
          distanceFromOrigin: stop.distance_from_origin,
          arrivalBattery: stop.arrival_battery,
          departureBattery: stop.departure_battery,
          chargingTime: stop.charging_time,
          chargingPower: stop.charging_power,
          costEstimate: stop.cost_estimate,
          arrivalTime: stop.arrival_time,
        })) || [],
      routeSegments:
        data.route_segments?.map((segment: any) => ({
          segmentIndex: segment.segment_index,
          startLocation: segment.start_location,
          endLocation: segment.end_location,
          distance: segment.distance,
          duration: segment.duration,
          energyConsumption: segment.energy_consumption,
          elevationGain: segment.elevation_gain,
          weatherCondition: segment.weather_condition,
          hasChargingStop: segment.has_charging_stop,
          chargingStop: segment.charging_stop
            ? {
                chargerId: segment.charging_stop.charger_id,
                name: segment.charging_stop.name,
                location: segment.charging_stop.location,
                distanceFromOrigin: segment.charging_stop.distance_from_origin,
                arrivalBattery: segment.charging_stop.arrival_battery,
                departureBattery: segment.charging_stop.departure_battery,
                chargingTime: segment.charging_stop.charging_time,
                chargingPower: segment.charging_stop.charging_power,
                costEstimate: segment.charging_stop.cost_estimate,
                arrivalTime: segment.charging_stop.arrival_time,
              }
            : undefined,
        })) || [],
      safetyAlerts:
        data.safety_alerts?.map((alert: any) => ({
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          location: alert.location,
        })) || [],
      estimatedArrivalBattery: data.estimated_arrival_battery,
      routePolyline: data.route_polyline,
      createdAt: data.created_at,
    };
  }
}
