import { IsString, IsArray, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class CreateMechanicDto {
  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  services: string[];

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerHour?: number;
}
