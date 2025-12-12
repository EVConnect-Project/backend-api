import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, IsEnum, Min } from 'class-validator';
import { BookingMode } from '../../charger/enums/booking-mode.enum';

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
  connectorType: 'type2' | 'type1_j1772' | 'ccs2' | 'chademo' | 'tesla_nacs';

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  maxPowerKw: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerKwh?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerHour?: number;

  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @IsEnum(BookingMode)
  @IsOptional()
  bookingMode?: BookingMode;
}
