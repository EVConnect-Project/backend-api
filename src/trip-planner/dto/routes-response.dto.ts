import { ChargerStopDto, SafetyWarningDto } from "./route-alternative.dto";

export class RouteOptionDto {
  id: string;
  routeNumber: number;
  distance: string;
  duration: string;
  polyline: string;
  chargingStops: ChargerStopDto[];

  // Keep current fields for backward-compatible frontend mapping.
  totalDistanceKm: number;
  totalDurationMinutes: number;
  drivingDurationMinutes: number;
  totalChargingTimeMinutes: number;
  totalChargingCostLkr: number;
  estimatedArrivalTime: string;
  routeScore: number;
  routePolyline: string;
  routeCoordinates?: Array<{ lat: number; lng: number }>;
  routeSummary: string;
  isRecommended: boolean;
  safetyWarnings: SafetyWarningDto[];
  drivingMode: string;
  arrivalBatteryPercent: number;
  etaConfidencePercent?: number;
  socConfidencePercent?: number;
  energyAdjustmentPercent?: number;
  weatherPenaltyPercent?: number;
  elevationPenaltyPercent?: number;
  hvacPenaltyPercent?: number;
}

export class RoutesResponseDto {
  routes: RouteOptionDto[];
  bestRouteId: string | null;
}
