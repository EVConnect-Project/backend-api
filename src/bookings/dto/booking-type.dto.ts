import {
  IsEnum,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsOptional,
} from "class-validator";
import { BookingType } from "../../charger/enums/booking-type.enum";

export class CreateWalkInBookingDto {
  @IsUUID()
  @IsNotEmpty()
  chargerId: string;

  @IsUUID()
  @IsOptional()
  socketId?: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}

export class CreatePreBookingDto {
  @IsUUID()
  @IsNotEmpty()
  chargerId: string;

  @IsUUID()
  @IsOptional()
  socketId?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}

export class CheckInBookingDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;
}
