import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMechanicApplicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  services: string[];

  @IsNumber()
  @Min(0)
  yearsOfExperience: number;

  @IsString()
  @IsOptional()
  certifications?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  pricePerHour: number;

  @IsString()
  @IsOptional()
  licenseNumber?: string;
}
