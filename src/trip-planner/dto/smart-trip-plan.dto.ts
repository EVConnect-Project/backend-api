import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum DrivingMode {
  ECO = 'eco',
  NORMAL = 'normal',
  SPORT = 'sport',
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

  @IsEnum(DrivingMode)
  @IsOptional()
  drivingMode?: DrivingMode = DrivingMode.NORMAL;

  @IsNumber()
  @IsOptional()
  @Min(50)
  @Max(100)
  targetBatteryPercent?: number = 80;
}
