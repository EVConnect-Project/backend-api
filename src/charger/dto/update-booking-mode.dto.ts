import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { BookingMode } from "../enums/booking-mode.enum";
import { BookingSettings } from "../interfaces/booking-settings.interface";

export class BookingSettingsDto implements BookingSettings {
  @IsNumber()
  @Min(15)
  @Max(1440)
  minBookingMinutes: number;

  @IsNumber()
  @Min(30)
  @Max(1440)
  maxBookingMinutes: number;

  @IsNumber()
  @Min(1)
  @Max(30)
  advanceBookingDays: number;

  @IsNumber()
  @Min(5)
  @Max(60)
  gracePeriodMinutes: number;

  @IsBoolean()
  allowSameDayBooking: boolean;
}

export class UpdateBookingModeDto {
  @IsEnum(BookingMode)
  @IsNotEmpty()
  bookingMode: BookingMode;

  @IsOptional()
  @ValidateNested()
  @Type(() => BookingSettingsDto)
  bookingSettings?: BookingSettingsDto;
}
