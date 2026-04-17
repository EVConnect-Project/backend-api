import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export enum DrivingMode {
  ECO = "eco",
  NORMAL = "normal",
  SPORT = "sport",
}

export class CreateTripPlanDto {
  // Route information
  @ValidateNested()
  @Type(() => LocationDto)
  origin: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  destination: LocationDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  waypoints?: LocationDto[];

  // Vehicle information
  @IsString()
  vehicleId: string;

  @IsNumber()
  @Min(0)
  batteryCapacity: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  currentBatteryLevel: number;

  @IsNumber()
  @Min(0)
  averageConsumption: number;

  @IsNumber()
  @Min(0)
  efficiency: number;

  @IsOptional()
  @IsEnum(DrivingMode)
  drivingMode?: DrivingMode;

  @IsString()
  connectorType: string;

  // Preferences
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredChargerTypes?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxChargingStops?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(50)
  minBatteryThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(100)
  targetBatteryAtStop?: number;
}
