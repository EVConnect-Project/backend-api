import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export enum DrivingMode {
  ECO = "eco",
  NORMAL = "normal",
  SPORT = "sport",
}

export enum RouteObjective {
  FASTEST = "fastest",
  BALANCED = "balanced",
  CHEAPEST = "cheapest",
}

export class WaypointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsString()
  @IsOptional()
  address?: string;
}

export class SmartTripPlanDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(-90)
  @Max(90)
  startLat: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(-180)
  @Max(180)
  startLng: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(-90)
  @Max(90)
  destLat: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(-180)
  @Max(180)
  destLng: number;

  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  currentBatteryPercent?: number = 80;

  @IsString()
  @IsOptional()
  startAddress?: string;

  @IsString()
  @IsOptional()
  destAddress?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  @IsOptional()
  waypoints?: WaypointDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredNetworks?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedNetworks?: string[];

  @IsNumber()
  @IsOptional()
  ambientTemperatureC?: number;

  @IsNumber()
  @IsOptional()
  windSpeedKph?: number;

  @IsNumber()
  @IsOptional()
  elevationDeltaM?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  hvacLoadKw?: number;

  @IsEnum(DrivingMode)
  @IsOptional()
  drivingMode?: DrivingMode = DrivingMode.NORMAL;

  @IsEnum(RouteObjective)
  @IsOptional()
  routeObjective?: RouteObjective = RouteObjective.BALANCED;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  minChargeAtChargingStationPercent?: number = 15;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  targetBatteryPercent?: number = 80;
}
