import { IsNotEmpty, IsInt, Min, Max, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  chargerId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
