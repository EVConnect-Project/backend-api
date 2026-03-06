export interface LocationDto {
  lat: number;
  lng: number;
  address?: string;
}

export interface ChargerStopDto {
  chargerId: string;
  chargerName: string;
  location: LocationDto;
  googleMapUrl: string;
  distanceFromStart: number; // km
  arrivalBatteryPercent: number;
  departureBatteryPercent: number;
  chargingTimeMinutes: number;
  chargingPowerKw: number;
  estimatedCostLkr: number;
  connectorType: string;
  reliabilityScore: number;
  chargerType: 'ac' | 'dc';
}

export interface SafetyWarningDto {
  type: 'low_battery' | 'no_chargers' | 'many_stops' | 'weather' | 'long_gap' | 'traffic';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export class RouteAlternativeDto {
  routeNumber: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  drivingDurationMinutes: number; // driving time only (no charging)
  totalChargingTimeMinutes: number;
  totalChargingCostLkr: number;
  estimatedArrivalTime: string; // ISO string
  chargingStops: ChargerStopDto[];
  routeScore: number; // Lower is better
  routePolyline: string; // Google Maps encoded polyline
  routeSummary: string; // e.g., "Route via A1 Highway"
  isRecommended: boolean;
  safetyWarnings: SafetyWarningDto[];
  drivingMode: string;
  arrivalBatteryPercent: number;
}
