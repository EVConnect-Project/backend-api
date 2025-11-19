import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, Min, Max } from 'class-validator';

export class EmergencyRequestDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsString()
  problemType?: string; // e.g., 'battery', 'tire', 'engine', 'towing'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredServices?: string[]; // e.g., ['battery-jump', 'towing']

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm?: number; // Default 10km

  @IsOptional()
  @IsString()
  urgencyLevel?: string; // 'low', 'medium', 'high', 'critical'
}
