import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateServiceStationDto {
  @IsString()
  @IsNotEmpty()
  stationName: string;

  @IsString()
  @IsNotEmpty()
  locationUrl: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  serviceCategories?: string[];

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

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsArray()
  @IsOptional()
  images?: string[];
}
