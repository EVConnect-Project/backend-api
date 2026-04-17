import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from "class-validator";
import { SocketDto } from "./socket.dto";

export class CreateIndividualChargerDto {
  @IsString()
  @IsOptional()
  stationType?: string; // 'individual' - for frontend compatibility

  @IsString()
  @IsNotEmpty()
  chargerName: string;

  @IsString()
  @IsNotEmpty()
  locationUrl: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  chargerType: "ac" | "dc";

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  maxPowerKw: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocketDto)
  sockets: SocketDto[];

  @IsOptional()
  openingHours?: {
    is24Hours?: boolean;
    schedule?: {
      [key: string]: { open: string; close: string; closed?: boolean };
    };
  };

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  bookingMode?: "pre_booking" | "walk_in" | "hybrid";

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];
}
