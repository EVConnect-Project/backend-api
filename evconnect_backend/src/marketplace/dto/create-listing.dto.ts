import { IsString, IsNumber, IsEnum, IsOptional, IsArray, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateListingDto {
  @IsString()
  @Transform(({ value }) => value?.toString().trim().replace(/<[^>]*>/g, ''))
  title: string;

  @IsString()
  @Transform(({ value }) => value?.toString().trim().replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<[^>]*>/g, ''))
  description: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(['new', 'used'])
  condition: 'new' | 'used';

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  long?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
