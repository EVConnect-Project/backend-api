import { PartialType } from '@nestjs/mapped-types';
import { CreateChargerDto } from './create-charger.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateChargerDto extends PartialType(CreateChargerDto) {
  @IsBoolean()
  @IsOptional()
  verified?: boolean;

  @IsString()
  @IsOptional()
  status?: string;
}
