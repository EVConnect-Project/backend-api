import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim().replace(/<[^>]*>/g, ''))
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim().replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<[^>]*>/g, ''))
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(['new', 'used'])
  condition?: 'new' | 'used';

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  long?: number;
}
