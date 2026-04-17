import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from "class-validator";
import { SocketDto } from "./socket.dto";

export class ChargerConfigDto {
  @IsString()
  @IsNotEmpty()
  chargerName: string;

  @IsString()
  @IsOptional()
  chargerIdentifier?: string;

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

  @IsString()
  @IsOptional()
  bookingMode?: "pre_booking" | "walk_in" | "hybrid";
}
