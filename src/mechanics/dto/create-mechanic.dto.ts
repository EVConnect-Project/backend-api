import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from "class-validator";
import { Transform } from "class-transformer";

// Transform function to parse flexible price formats (100000, 100,000, 100,000.50, etc)
const parsePriceFormat = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;
  // Convert to string and remove commas, spaces, and other non-numeric characters (except decimal point)
  const cleaned = value
    .toString()
    .trim()
    .replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

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
  @Min(1)
  @Max(100)
  serviceRadius?: number; // Service radius in kilometers

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
  @Transform(({ value }) => parsePriceFormat(value))
  pricePerHour?: number;
}
