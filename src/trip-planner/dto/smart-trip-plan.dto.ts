import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

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
}
