export class ChargingStopDto {
  chargerId: string;
  name: string;
  location: { lat: number; lng: number };
  distanceFromOrigin: number;
  arrivalBattery: number;
  departureBattery: number;
  chargingTime: number;
  chargingPower: number;
  costEstimate?: number;
  arrivalTime?: string;
}

export class RouteSegmentDto {
  segmentIndex: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  distance: number;
  duration: number;
  energyConsumption: number;
  elevationGain?: number;
  weatherCondition?: string;
  hasChargingStop: boolean;
  chargingStop?: ChargingStopDto;
}

export class SafetyAlertDto {
  type: string;
  severity: string;
  message: string;
  location?: { lat: number; lng: number };
}

export class TripPlanResponseDto {
  tripId: string;
  totalDistance: number;
  totalDuration: number;
  totalEnergyRequired: number;
  chargingStops: ChargingStopDto[];
  routeSegments: RouteSegmentDto[];
  safetyAlerts: SafetyAlertDto[];
  estimatedArrivalBattery: number;
  routePolyline?: string;
  createdAt: string;
}
