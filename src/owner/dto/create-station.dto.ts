import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { ChargerConfigDto } from './charger-config.dto';

export class CreateStationDto {
  @IsString()
  @IsOptional()
  stationType?: string; // 'station' - for frontend compatibility

  @IsString()
  @IsNotEmpty()
  stationName: string;

  @IsString()
  @IsNotEmpty()
  locationUrl: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  parkingCapacity?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  amenities?: string[];

  @IsOptional()
  openingHours?: {
    is24Hours?: boolean;
    schedule?: {
      [key: string]: { open: string; close: string; closed?: boolean };
    };
  };

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  accessType?: 'public' | 'private' | 'semi-public';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChargerConfigDto)
  chargers: ChargerConfigDto[];
}
