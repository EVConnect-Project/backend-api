import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

// HH:MM 24-hour
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
// YYYY-MM-DD
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateServiceStationBookingDto {
  @Matches(ISO_DATE, {
    message: "appointmentDate must be YYYY-MM-DD",
  })
  appointmentDate!: string;

  @Matches(HHMM, {
    message: "slotTime must be HH:MM (24h)",
  })
  slotTime!: string;

  @IsString()
  @MaxLength(80)
  serviceType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CompleteServiceStationBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RateServiceStationBookingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
