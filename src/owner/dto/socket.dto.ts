import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";
import { BookingMode } from "../../charger/enums/booking-mode.enum";

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

export class SocketDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  socketNumber: number;

  @IsString()
  @IsOptional()
  socketLabel?: string;

  @IsString()
  @IsNotEmpty()
  connectorType: "type2" | "type1_j1772" | "ccs2" | "chademo" | "tesla_nacs";

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  maxPowerKw: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parsePriceFormat(value))
  pricePerKwh?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parsePriceFormat(value))
  pricePerHour?: number;

  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @IsEnum(BookingMode)
  @IsOptional()
  bookingMode?: BookingMode;
}
