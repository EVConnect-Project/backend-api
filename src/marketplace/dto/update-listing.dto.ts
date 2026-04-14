import { IsString, IsNumber, IsEnum, IsOptional, Min, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

// Transform function to parse flexible price formats (100000, 100,000, 100,000.50, etc)
const parsePriceFormat = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  // Convert to string and remove commas, spaces, and other non-numeric characters (except decimal point)
  const cleaned = value.toString().trim().replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

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
  @Transform(({ value }) => parsePriceFormat(value))
  price?: number;

  @IsOptional()
  @IsString()
  category?: string;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
