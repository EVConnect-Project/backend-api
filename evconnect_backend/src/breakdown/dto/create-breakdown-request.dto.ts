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
  address?: string;

  @IsString()
  @IsNotEmpty()
  issueDescription: string;

  @IsString()
  @IsOptional()
  vehicleInfo?: string;
}
