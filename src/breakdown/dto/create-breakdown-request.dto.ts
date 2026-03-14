import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBreakdownRequestDto {
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  lng: number;

  @IsString()
  @IsOptional()
  problemType?: string;

  @IsString()
  @IsNotEmpty()
  problemDescription: string;

  @IsString()
  @IsOptional()
  urgencyLevel?: string;

  @IsString()
  @IsOptional()
  vehicleInfo?: string;

  @IsString()
  @IsOptional()
  userPhone?: string;
}
