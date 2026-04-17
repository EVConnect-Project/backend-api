import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsNumber,
  Min,
} from "class-validator";

export class CreateBookingDto {
  @IsUUID()
  chargerId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
