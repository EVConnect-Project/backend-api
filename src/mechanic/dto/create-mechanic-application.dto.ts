import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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

export class CreateMechanicApplicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  services: string[];

  @IsNumber()
  @Min(0)
  yearsOfExperience: number;

  @IsString()
  @IsOptional()
  certifications?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Transform(({ value }) => parsePriceFormat(value))
  pricePerHour: number;

  @IsString()
  @IsOptional()
  licenseNumber?: string;
}
