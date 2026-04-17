import { IsString, IsNumber, IsOptional, Min, Max } from "class-validator";

export class PlanRouteDto {
  @IsString()
  start: string;

  @IsString()
  destination: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  currentBattery?: number; // percentage

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minBatteryAtStop?: number; // Don't let battery go below this %
}
