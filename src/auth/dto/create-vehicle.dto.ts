import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class ChargingCurvePoint {
  @IsNumber()
  soc: number; // State of charge percentage

  @IsNumber()
  power: number; // Charging power in kW
}

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

  // Normalized array of connector types for compatibility matching
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  connectorTypes?: string[];

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAcChargingPower?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDcChargingPower?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  rangeKm?: number;

  // Trip Planning Fields
  @IsOptional()
  @IsNumber()
  @Min(0)
  averageConsumption?: number; // Wh/km

  @IsOptional()
  @IsNumber()
  @Min(0)
  efficiency?: number; // km/kWh

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChargingCurvePoint)
  chargingCurve?: ChargingCurvePoint[];

  @IsOptional()
  @IsString()
  @IsIn(["eco", "normal", "sport"])
  drivingMode?: "eco" | "normal" | "sport";
}
