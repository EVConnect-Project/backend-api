import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

class WaypointDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  address?: string;
}

class ChargingStopDto {
  @IsString()
  chargerId: string;

  @IsString()
  chargerName: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  distanceFromStart: number;

  @IsInt()
  arrivalBatteryPercent: number;

  @IsInt()
  departureBatteryPercent: number;

  @IsInt()
  chargingTimeMinutes: number;

  @IsNumber()
  chargingPowerKw: number;

  @IsInt()
  estimatedCostLkr: number;

  @IsString()
  connectorType: string;

  @IsOptional()
  @IsString()
  chargerType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  backupChargerNames?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  availabilityConfidencePercent?: number;
}

class SafetyWarningDto {
  @IsString()
  type: string;

  @IsString()
  severity: string;

  @IsString()
  message: string;
}

export class SaveTripDto {
  @IsString()
  vehicleId: string;

  @IsNumber()
  startLat: number;

  @IsNumber()
  startLng: number;

  @IsOptional()
  @IsString()
  startAddress?: string;

  @IsNumber()
  destLat: number;

  @IsNumber()
  destLng: number;

  @IsOptional()
  @IsString()
  destAddress?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  waypoints?: WaypointDto[];

  @IsNumber()
  totalDistanceKm: number;

  @IsInt()
  totalDurationMinutes: number;

  @IsOptional()
  @IsInt()
  drivingDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  totalChargingTimeMinutes?: number;

  @IsOptional()
  @IsInt()
  totalChargingCostLkr?: number;

  @IsOptional()
  @IsInt()
  routeScore?: number;

  @IsOptional()
  @IsString()
  routePolyline?: string;

  @IsOptional()
  @IsString()
  routeSummary?: string;

  @IsOptional()
  @IsString()
  @IsIn(["eco", "normal", "sport"])
  drivingMode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  startBatteryPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  arrivalBatteryPercent?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChargingStopDto)
  chargingStops?: ChargingStopDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SafetyWarningDto)
  safetyWarnings?: SafetyWarningDto[];
}
