import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max, IsUUID, ValidateIf, IsEnum, IsArray } from 'class-validator';
import { BookingMode } from '../enums/booking-mode.enum';

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

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  chargerType?: 'ac' | 'dc';

  @IsString()
  @IsOptional()
  speedType?: 'ac_slow' | 'ac_fast' | 'dc_fast' | 'dc_rapid' | 'ultra_rapid' | 'tesla_supercharger';

  @IsString()
  @IsOptional()
  connectorType?: 'type2' | 'type1_j1772' | 'ccs2' | 'chademo' | 'tesla_nacs';

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  numberOfPlugs?: number;

  @IsOptional()
  openingHours?: {
    is24Hours: boolean;
    schedule?: {
      [key: string]: { open: string; close: string; closed?: boolean };
    };
  };

  @IsEnum(BookingMode)
  @IsOptional()
  bookingMode?: BookingMode;

  @ValidateIf(o => o.bookingMode === BookingMode.PRE_BOOKING)
  @IsUUID()
  @IsNotEmpty({ message: 'Payment account is required for pre-booking mode' })
  paymentAccountId?: string;

  @IsString()
  @IsOptional()
  googleMapUrl?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  reliabilityScore?: number;

  @IsArray()
  @IsOptional()
  images?: string[];
}
