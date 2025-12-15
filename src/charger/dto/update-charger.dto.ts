import { PartialType } from '@nestjs/mapped-types';
import { CreateChargerDto } from './create-charger.dto';
import { IsBoolean, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateChargerDto extends PartialType(CreateChargerDto) {
  @IsBoolean()
  @IsOptional()
  verified?: boolean;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  googleMapUrl?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  reliabilityScore?: number;
}
