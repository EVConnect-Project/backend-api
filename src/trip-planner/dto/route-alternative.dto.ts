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
}

export interface SafetyWarningDto {
  type: 'low_battery' | 'no_chargers' | 'many_stops' | 'weather' | 'long_gap';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export class RouteAlternativeDto {
  routeNumber: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  estimatedArrivalTime: string; // ISO string
  chargingStops: ChargerStopDto[];
  routeScore: number; // Lower is better
  routePolyline: string; // Google Maps encoded polyline
  routeSummary: string; // e.g., "Route via A1 Highway"
  isRecommended: boolean;
  safetyWarnings: SafetyWarningDto[];
}
