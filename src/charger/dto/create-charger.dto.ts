import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateChargerDto {
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

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  powerKw: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  pricePerKwh: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
