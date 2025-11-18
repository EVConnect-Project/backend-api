import { IsString, IsNumber, IsNotEmpty, Min, Max } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  make: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsNumber()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsNumber()
  @Min(1)
  batteryCapacity: number;

  @IsString()
  @IsNotEmpty()
  connectorType: string;

  @IsNumber()
  @Min(1)
  rangeKm: number;
}
